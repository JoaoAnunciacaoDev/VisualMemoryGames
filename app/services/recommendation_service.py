import concurrent.futures
import json
import os
from typing import Dict, List, Optional, Set

from sqlalchemy import String, cast, func, or_
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Session, joinedload

from app.models.game import Game
from app.models.user_game import UserGame
from app.services.external_cache import build_cache_key, get_cached, set_cached
from app.services.game_identity import (
    attach_provider_id,
    find_game_by_provider_id,
    normalize_game_provider,
    provider_ids_for_games,
)
from app.services.game_provider import get_games_by_genres_rawg
from app.services.igdb_service import get_games_by_genres_igdb


def parse_json_list(field) -> List:
    """Deserializa com segurança campos JSON que podem vir
    como string ou lista dependendo do driver do banco."""
    if not field:
        return []
    if isinstance(field, list):
        return field
    if isinstance(field, str):
        try:
            parsed = json.loads(field)
            if isinstance(parsed, list):
                return parsed
        except Exception:
            pass
    return []


def _format_games(games: List[Game]) -> List[Dict]:
    return [
        {
            "id": g.id,
            "external_id": getattr(g, "_recommendation_external_id", g.external_id),
            "title": g.title,
            "cover_url": g.cover_url,
            "genres": parse_json_list(g.genres),
            "release_year": g.release_year,
            "platforms": parse_json_list(g.platforms),
            "source": getattr(g, "_recommendation_source", "catalog"),
        }
        for g in games
    ]


class RecommendationService:
    def __init__(self, db: Session, user_id: str):
        self.db = db
        self.user_id = user_id
        # Carrega os external_ids e game_ids que o usuário já tem para excluir das recomendações
        user_games = (
            self.db.query(UserGame)
            .options(joinedload(UserGame.game))
            .filter(UserGame.user_id == self.user_id)
            .all()
        )
        self.owned_game_ids = {ug.game_id for ug in user_games}
        self.owned_external_ids = {ug.game.external_id for ug in user_games if ug.game.external_id}
        self.provider_ids_by_game = provider_ids_for_games(self.db, self.owned_game_ids)
        self.owned_provider_ids = set(self.provider_ids_by_game.values())
        self.user_games = user_games
        self.genre_weights = self._build_genre_weights()

    @staticmethod
    def _user_game_strength(user_game: UserGame) -> tuple:
        """Ordena sinais explícitos antes de tempo de jogo, de forma estável."""
        return (
            1 if user_game.favorite else 0,
            float(user_game.rating or 0),
            1 if user_game.platinum_at else 0,
            float(user_game.hours_played or 0),
            user_game.game.title.casefold(),
        )

    def _build_genre_weights(self) -> Dict[str, float]:
        weights: Dict[str, float] = {}
        status_weights = {
            "Jogando": 1.5,
            "Zerado": 2.0,
            "Platinado": 3.0,
            "Abandonado": -1.5,
        }
        for user_game in self.user_games:
            signal = 1.0
            signal += 3.0 if user_game.favorite else 0.0
            signal += min(2.0, max(0.0, float(user_game.rating or 0)) / 5.0)
            signal += 2.0 if user_game.platinum_at else 0.0
            signal += status_weights.get(user_game.status, 0.0)
            for genre in parse_json_list(user_game.game.genres):
                key = str(genre).casefold()
                weights[key] = weights.get(key, 0.0) + signal
        return weights

    def _candidate_score(self, game: Game, target_genres: List[str]) -> tuple:
        game_genres = {str(genre).casefold() for genre in parse_json_list(game.genres)}
        target = {genre.casefold() for genre in target_genres}
        target_score = sum(self.genre_weights.get(genre, 1.0) for genre in game_genres & target)
        profile_score = sum(self.genre_weights.get(genre, 0.0) for genre in game_genres)
        metadata_score = int(bool(game.cover_url)) + int(bool(game.release_year))
        return (
            target_score,
            profile_score,
            len(game_genres & target),
            metadata_score,
            game.release_year or 0,
            game.title.casefold(),
        )

    def get_local_games_by_genres(
        self,
        genres: List[str],
        count: int = 10,
        exclude_external_ids: Optional[Set[int]] = None,
        exclude_game_ids: Optional[Set[str]] = None,
    ) -> List[Game]:
        """Busca no banco local jogos com algum gênero em comum que o usuário não tenha."""
        if not genres:
            return []

        excludes = (
            exclude_external_ids if exclude_external_ids is not None else self.owned_external_ids
        )

        if self.db.bind is not None and self.db.bind.dialect.name == "postgresql":
            clauses = [cast(Game.genres, JSONB).contains([genre]) for genre in genres]
        else:
            clauses = []
            for genre in genres:
                clauses.append(cast(Game.genres, String).ilike(f'%"{genre}"%'))
                clauses.append(cast(Game.genres, String).ilike(f"%{genre}%"))

        query = self.db.query(Game).filter(~Game.id.in_(self.owned_game_ids))
        if exclude_game_ids:
            query = query.filter(~Game.id.in_(exclude_game_ids))
        if excludes:
            query = query.filter(~Game.external_id.in_(excludes))

        if clauses:
            query = query.filter(or_(*clauses))

        candidate_limit = max(count, min(500, int(os.getenv("RECOMMENDATION_CANDIDATES", "150"))))
        candidates = query.order_by(Game.id).limit(candidate_limit).all()
        ranked = sorted(
            candidates,
            key=lambda game: self._candidate_score(game, genres),
            reverse=True,
        )
        selected = ranked[:count]
        identities = provider_ids_for_games(self.db, (game.id for game in selected))
        for game in selected:
            identity = identities.get(game.id)
            if identity:
                game._recommendation_source = identity[0]
                game._recommendation_external_id = identity[1]
        return selected

    def _save_external_games(
        self, games_by_identity: Dict[tuple[str, int], Dict]
    ) -> Dict[tuple[str, int], Game]:
        saved: Dict[tuple[str, int], Game] = {}
        for (provider, external_id), data in games_by_identity.items():
            game = find_game_by_provider_id(self.db, provider, external_id)
            if game is None:
                game = (
                    self.db.query(Game)
                    .filter(func.lower(Game.title) == data["title"].strip().casefold())
                    .first()
                )
            if game is None:
                legacy_conflict = (
                    self.db.query(Game).filter(Game.external_id == external_id).first()
                )
                game = Game(
                    external_id=None if legacy_conflict else external_id,
                    title=data["title"],
                    cover_url=data.get("cover_url"),
                    release_year=data.get("release_year"),
                    platforms=data.get("platforms", []),
                    genres=data.get("genres", []),
                    is_manual=False,
                )
                self.db.add(game)
                self.db.flush()
            owner = attach_provider_id(self.db, game, provider, external_id)
            owner._recommendation_source = provider
            owner._recommendation_external_id = external_id
            saved[(provider, external_id)] = owner
        if saved:
            self.db.commit()
        return saved

    def get_platinum_recommendations(self) -> Optional[Dict]:
        platinum = [ug for ug in self.user_games if ug.platinum_at]
        if not platinum:
            return None
        ref = max(platinum, key=self._user_game_strength).game
        return {
            "id": "platinum",
            "title": f"Já que você platinou {ref.title}, experimente:",
            "genres": parse_json_list(ref.genres),
            "ref_game": ref,
        }

    def get_playing_recommendations(self) -> Optional[Dict]:
        playing = [ug for ug in self.user_games if ug.status == "Jogando"]
        if not playing:
            return None
        ref = max(playing, key=self._user_game_strength).game
        return {
            "id": "playing",
            "title": f"Porque você está jogando {ref.title}:",
            "genres": parse_json_list(ref.genres),
            "ref_game": ref,
        }

    def get_favorite_games_recommendations(self) -> Optional[Dict]:
        favorites = [ug for ug in self.user_games if ug.favorite]
        if not favorites:
            return None
        ref = max(favorites, key=self._user_game_strength).game
        return {
            "id": "favorites",
            "title": f"Porque você favoritou {ref.title}:",
            "genres": parse_json_list(ref.genres),
            "ref_game": ref,
        }

    def get_top_rated_recommendations(self) -> Optional[Dict]:
        rated = [ug for ug in self.user_games if ug.rating is not None]
        if not rated:
            return None
        best = max(rated, key=lambda x: x.rating)
        ref = best.game
        return {
            "id": "rated",
            "title": f"Baseado na sua nota de {ref.title}:",
            "genres": parse_json_list(ref.genres),
            "ref_game": ref,
        }

    def get_favorite_genres_recommendations(self) -> Optional[Dict]:
        positive_genres = {
            genre: weight for genre, weight in self.genre_weights.items() if weight > 0
        }
        if not positive_genres:
            return None
        display_names = {
            str(genre).casefold(): str(genre)
            for ug in self.user_games
            for genre in parse_json_list(ug.game.genres)
        }
        top_genres = sorted(
            positive_genres.items(),
            key=lambda item: (-item[1], item[0]),
        )[:3]
        target_genres = [display_names.get(name, name) for name, _ in top_genres]
        genre_str = " e ".join(target_genres)
        return {
            "id": "genres",
            "title": f"Baseado nos seus gêneros favoritos ({genre_str}):",
            "genres": target_genres,
            "ref_game": None,
        }

    def get_all_recommendations(self) -> List[Dict]:
        fingerprint = [
            (ug.game_id, ug.status, ug.favorite, ug.rating, str(ug.platinum_at))
            for ug in sorted(self.user_games, key=lambda item: item.game_id)
        ]
        cache_key = build_cache_key("ranking-v3", self.user_id, fingerprint)
        cached = get_cached("recommendations", cache_key)
        if cached is not None:
            return cached

        # 1. Obter todas as categorias ativas
        categories_meta = [
            self.get_platinum_recommendations(),
            self.get_playing_recommendations(),
            self.get_favorite_genres_recommendations(),
            self.get_favorite_games_recommendations(),
            self.get_top_rated_recommendations(),
        ]
        categories = [c for c in categories_meta if c is not None]
        if not categories:
            set_cached("recommendations", cache_key, [], ttl_seconds=300)
            return []

        # 2. Obter recomendações locais para cada categoria, evitando duplicações
        local_games_by_cat = {}
        current_excludes = set(self.owned_external_ids)
        selected_game_ids = set(self.owned_game_ids)

        for cat in categories:
            local_games = self.get_local_games_by_genres(
                cat["genres"],
                count=10,
                exclude_external_ids=current_excludes,
                exclude_game_ids=selected_game_ids,
            )
            local_games_by_cat[cat["id"]] = local_games
            current_excludes.update({g.external_id for g in local_games if g.external_id})
            selected_game_ids.update(game.id for game in local_games)

        # 3. Determinar quais categorias precisam do catálogo externo.
        categories_to_fetch = []
        for cat in categories:
            local_len = len(local_games_by_cat[cat["id"]])
            if local_len < 10 and cat["genres"]:
                categories_to_fetch.append((cat["id"], cat["genres"], 10 - local_len))

        # 4. Consultar IGDB primeiro. RAWG somente complementa/faz fallback.
        external_results = {}
        if categories_to_fetch:

            def _fetch_genres_task(cat_id: str, genres: List[str], needed: int):
                try:
                    fetch_size = max(20, needed * 2)
                    primary = get_games_by_genres_igdb(genres[:3], page_size=fetch_size)
                    combined = []
                    seen = set()
                    for game in primary:
                        game = {**game, "source": "igdb"}
                        key = (game.get("source"), game.get("external_id"))
                        if key not in seen:
                            seen.add(key)
                            combined.append(game)

                    # Owned/duplicate games may consume part of the IGDB response,
                    # so keep a small buffer before deciding that fallback is unnecessary.
                    if len(combined) < needed + 5:
                        genres_str = ",".join(genres[:2]).lower()
                        fallback = get_games_by_genres_rawg(
                            genres=genres_str,
                            page_size=fetch_size,
                        )
                        seen_titles = {game["title"].casefold().strip() for game in combined}
                        for game in fallback:
                            title = game["title"].casefold().strip()
                            if title in seen_titles:
                                continue
                            seen_titles.add(title)
                            combined.append({**game, "source": "rawg"})
                    return cat_id, combined
                except Exception:
                    return cat_id, []

            with concurrent.futures.ThreadPoolExecutor(
                max_workers=min(2, len(categories_to_fetch))
            ) as executor:
                futures = [
                    executor.submit(_fetch_genres_task, cat_id, genres, needed)
                    for cat_id, genres, needed in categories_to_fetch
                ]
                for future in concurrent.futures.as_completed(futures):
                    try:
                        cat_id, games = future.result()
                        external_results[cat_id] = games
                    except Exception:
                        pass

        # 5. Agrupar novos jogos externos e salvar em lote.
        all_external_games_to_save: Dict[tuple[str, int], Dict] = {}
        for games in external_results.values():
            for game in games:
                ext_id = game["external_id"]
                provider = normalize_game_provider(game.get("source"))
                if not provider:
                    continue
                identity = (provider, ext_id)
                if identity in self.owned_provider_ids:
                    continue
                # Registros legados não possuem namespace; excluir pelo ID é
                # mais seguro do que recomendar um jogo já pertencente ao usuário.
                if not self.owned_provider_ids and ext_id in self.owned_external_ids:
                    continue
                all_external_games_to_save.setdefault(identity, game)

        saved_games_map = self._save_external_games(all_external_games_to_save)

        # 6. Construir carrosséis desduplicados em toda a resposta.
        final_carousels = []
        for cat in categories:
            cat_id = cat["id"]
            games_list = list(local_games_by_cat[cat_id])

            if len(games_list) < 10 and cat_id in external_results:
                for external_game in external_results[cat_id]:
                    ext_id = external_game["external_id"]
                    provider = normalize_game_provider(external_game.get("source"))
                    identity = (provider, ext_id) if provider else None
                    game = saved_games_map.get(identity) if identity else None
                    if game and game.id not in selected_game_ids:
                        games_list.append(game)
                        selected_game_ids.add(game.id)
                        if len(games_list) >= 10:
                            break

            if games_list:
                final_carousels.append(
                    {
                        "title": cat["title"],
                        "games": _format_games(games_list),
                    }
                )

        set_cached("recommendations", cache_key, final_carousels, ttl_seconds=300)
        return final_carousels
