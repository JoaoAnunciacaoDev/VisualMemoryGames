import concurrent.futures
import json
import random
from typing import Dict, List, Optional, Set

from sqlalchemy import String, cast, or_
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.sql.expression import func

from app.models.game import Game
from app.models.user_game import UserGame
from app.services.game_provider import get_games_by_genres_rawg


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


def save_games_to_db(games_data: List[Dict], db: Session) -> List[Game]:
    """Salva jogos vindos da RAWG no banco local se não existirem, e retorna os objetos Game."""
    if not games_data:
        return []

    ext_ids = [data["external_id"] for data in games_data]
    existing_games = db.query(Game).filter(Game.external_id.in_(ext_ids)).all()
    existing_map = {g.external_id: g for g in existing_games}

    new_games = []
    for data in games_data:
        ext_id = data["external_id"]
        if ext_id not in existing_map:
            game = Game(
                external_id=ext_id,
                title=data["title"],
                cover_url=data.get("cover_url"),
                release_year=data.get("release_year"),
                platforms=data.get("platforms", []),
                genres=data.get("genres", []),
                is_manual=False,
            )
            db.add(game)
            new_games.append(game)

    if new_games:
        db.commit()
        for g in new_games:
            existing_map[g.external_id] = g

    return [
        existing_map[data["external_id"]]
        for data in games_data
        if data["external_id"] in existing_map
    ]


def fetch_recommendations_fallback(
    genres: List[str], exclude_ids: Set[int], db: Session, count: int = 10
) -> List[Game]:
    """Busca jogos na RAWG por gêneros e retorna os não possuídos pelo usuário."""
    if not genres:
        return []
    genres_str = ",".join(genres[:2]).lower()  # Filtra pelos 2 principais gêneros para RAWG
    raw_games = get_games_by_genres_rawg(genres=genres_str, page_size=20)
    # Filtra os que o usuário já tem antes de salvar pra não poluir atoa (ou salva tudo)
    filtered_data = [g for g in raw_games if g["external_id"] not in exclude_ids]
    # Salva no DB
    saved_games = save_games_to_db(filtered_data, db)
    # Retorna os jogos únicos limitados ao count
    return saved_games[:count]


def _format_games(games: List[Game]) -> List[Dict]:
    return [
        {
            "id": g.id,
            "external_id": g.external_id,
            "title": g.title,
            "cover_url": g.cover_url,
            "genres": parse_json_list(g.genres),
            "release_year": g.release_year,
            "platforms": parse_json_list(g.platforms),
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
        self.user_games = user_games

    def get_local_games_by_genres(
        self, genres: List[str], count: int = 10, exclude_external_ids: Optional[Set[int]] = None
    ) -> List[Game]:
        """Busca no banco local jogos com algum gênero em comum que o usuário não tenha."""
        if not genres:
            return []

        excludes = (
            exclude_external_ids if exclude_external_ids is not None else self.owned_external_ids
        )

        clauses = []
        for g in genres:
            clauses.append(cast(Game.genres, String).ilike(f'%"{g}"%'))
            clauses.append(cast(Game.genres, String).ilike(f'%{g}%'))

        query = self.db.query(Game).filter(~Game.id.in_(self.owned_game_ids))
        if excludes:
            query = query.filter(~Game.external_id.in_(excludes))

        if clauses:
            query = query.filter(or_(*clauses))

        local_recs = query.order_by(func.random()).limit(count).all()
        return local_recs

    def get_platinum_recommendations(self) -> Optional[Dict]:
        platinum = [ug for ug in self.user_games if ug.platinum_at]
        if not platinum:
            return None
        ref = random.choice(platinum).game
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
        ref = random.choice(playing).game
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
        ref = random.choice(favorites).game
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
        genre_counts = {}
        for ug in self.user_games:
            genres_list = parse_json_list(ug.game.genres)
            for genre in genres_list:
                genre_counts[genre] = genre_counts.get(genre, 0) + 1
        if not genre_counts:
            return None
        top_genres = sorted(genre_counts.items(), key=lambda x: x[1], reverse=True)[:2]
        target_genres = [g[0] for g in top_genres]
        genre_str = " e ".join(target_genres)
        return {
            "id": "genres",
            "title": f"Baseado nos seus gêneros favoritos ({genre_str}):",
            "genres": target_genres,
            "ref_game": None,
        }

    def get_all_recommendations(self) -> List[Dict]:
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
            return []

        # 2. Obter recomendações locais para cada categoria, evitando duplicações
        local_games_by_cat = {}
        current_excludes = set(self.owned_external_ids)

        for cat in categories:
            local_games = self.get_local_games_by_genres(
                cat["genres"], count=10, exclude_external_ids=current_excludes
            )
            local_games_by_cat[cat["id"]] = local_games
            current_excludes.update({g.external_id for g in local_games if g.external_id})

        # 3. Determinar para quais categorias precisamos de fallback externo (RAWG)
        categories_to_fetch = []
        for cat in categories:
            local_len = len(local_games_by_cat[cat["id"]])
            if local_len < 10 and cat["genres"]:
                categories_to_fetch.append((cat["id"], cat["genres"], 10 - local_len))

        # 4. Buscar recomendações do RAWG em paralelo
        rawg_results = {}
        if categories_to_fetch:

            def _fetch_genres_task(cat_id: str, genres: List[str]):
                try:
                    genres_str = ",".join(genres[:2]).lower()
                    return cat_id, get_games_by_genres_rawg(genres=genres_str, page_size=20)
                except Exception:
                    return cat_id, []

            with concurrent.futures.ThreadPoolExecutor(
                max_workers=len(categories_to_fetch)
            ) as executor:
                futures = [
                    executor.submit(_fetch_genres_task, cat_id, genres)
                    for cat_id, genres, _ in categories_to_fetch
                ]
                for future in concurrent.futures.as_completed(futures):
                    try:
                        cat_id, raw_games = future.result()
                        rawg_results[cat_id] = raw_games
                    except Exception:
                        pass

        # 5. Agrupar novos jogos do RAWG e salvar em lote (bulk)
        all_raw_games_to_save = {}
        for cat_id, raw_games in rawg_results.items():
            for rg in raw_games:
                ext_id = rg["external_id"]
                if ext_id not in self.owned_external_ids and ext_id not in all_raw_games_to_save:
                    all_raw_games_to_save[ext_id] = rg

        saved_games_map = {}
        if all_raw_games_to_save:
            ext_ids = list(all_raw_games_to_save.keys())
            existing_games = self.db.query(Game).filter(Game.external_id.in_(ext_ids)).all()
            existing_map = {g.external_id: g for g in existing_games}

            new_games = []
            for ext_id, data in all_raw_games_to_save.items():
                if ext_id in existing_map:
                    saved_games_map[ext_id] = existing_map[ext_id]
                else:
                    game = Game(
                        external_id=ext_id,
                        title=data["title"],
                        cover_url=data.get("cover_url"),
                        release_year=data.get("release_year"),
                        platforms=data.get("platforms", []),
                        genres=data.get("genres", []),
                        is_manual=False,
                    )
                    self.db.add(game)
                    new_games.append(game)

            if new_games:
                self.db.commit()
                for g in new_games:
                    saved_games_map[g.external_id] = g

        # 6. Construir os carrosséis finais preenchendo com jogos do RAWG desduplicados
        final_carousels = []
        for cat in categories:
            cat_id = cat["id"]
            games_list = list(local_games_by_cat[cat_id])

            if len(games_list) < 10 and cat_id in rawg_results:
                raw_games = rawg_results[cat_id]
                for rg in raw_games:
                    ext_id = rg["external_id"]
                    if ext_id in saved_games_map and ext_id not in current_excludes:
                        games_list.append(saved_games_map[ext_id])
                        current_excludes.add(ext_id)
                        if len(games_list) >= 10:
                            break

            if games_list:
                final_carousels.append({
                    "title": cat["title"],
                    "games": _format_games(games_list),
                })

        return final_carousels
