import random
from typing import Dict, List, Set

from sqlalchemy.orm import Session
from sqlalchemy.sql.expression import func

from app.models.game import Game
from app.models.user_game import UserGame
from app.services.game_provider import get_games_by_genres_rawg


def save_games_to_db(games_data: List[Dict], db: Session) -> List[Game]:
    """Salva jogos vindos da RAWG no banco local se não existirem, e retorna os objetos Game."""
    games = []
    for data in games_data:
        game = db.query(Game).filter(Game.external_id == data["external_id"]).first()
        if not game:
            game = Game(
                external_id=data["external_id"],
                title=data["title"],
                cover_url=data.get("cover_url"),
                release_year=data.get("release_year"),
                platforms=data.get("platforms", []),
                genres=data.get("genres", []),
                is_manual=False,
            )
            db.add(game)
        games.append(game)
    db.commit()
    return games


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
            "genres": g.genres,
            "release_year": g.release_year,
            "platforms": g.platforms,
        }
        for g in games
    ]


class RecommendationService:
    def __init__(self, db: Session, user_id: str):
        self.db = db
        self.user_id = user_id
        # Carrega os external_ids que o usuário já tem para excluir das recomendações
        user_games = self.db.query(UserGame).filter(UserGame.user_id == self.user_id).all()
        self.owned_external_ids = {ug.game.external_id for ug in user_games if ug.game.external_id}
        self.user_games = user_games

    def get_local_games_by_genres(self, genres: List[str], count: int = 10) -> List[Game]:
        """Busca no banco local jogos com algum gênero em comum que o usuário não tenha."""
        if not genres:
            return []
        # Para evitar recomendar "lixo" de cache antigo,
        # filtramos apenas jogos que alguém tenha na biblioteca!
        owned_by_others_subq = self.db.query(UserGame.game_id).distinct()
        all_not_owned = (
            self.db.query(Game)
            .filter(
                Game.id.in_(owned_by_others_subq), ~Game.external_id.in_(self.owned_external_ids)
            )
            .order_by(func.random())
            .limit(100)
            .all()
        )
        matches = []
        genres_lower = {g.lower() for g in genres}
        for g in all_not_owned:
            game_genres = {genre.lower() for genre in (g.genres or [])}
            if game_genres & genres_lower:
                matches.append(g)
                if len(matches) >= count:
                    break
        return matches

    def _hybrid_recommendation(
        self, reference_game: Game = None, genres: List[str] = None, count: int = 10
    ) -> List[Dict]:
        target_genres = genres or []
        if reference_game:
            target_genres = reference_game.genres or []
        local_recs = self.get_local_games_by_genres(target_genres, count=count)
        if len(local_recs) < count:
            needed = count - len(local_recs)
            external_recs = fetch_recommendations_fallback(
                target_genres, self.owned_external_ids, self.db, count=needed
            )
            self.owned_external_ids.update({g.external_id for g in external_recs if g.external_id})
            local_recs.extend(external_recs)
        return _format_games(local_recs)

    def get_platinum_recommendations(self) -> Dict:
        platinum = [ug for ug in self.user_games if ug.platinum_at]
        if not platinum:
            return None
        ref = random.choice(platinum).game
        return {
            "title": f"Já que você platinou {ref.title}, experimente:",
            "games": self._hybrid_recommendation(reference_game=ref),
        }

    def get_playing_recommendations(self) -> Dict:
        playing = [ug for ug in self.user_games if ug.status == "Jogando"]
        if not playing:
            return None
        ref = random.choice(playing).game
        return {
            "title": f"Porque você está jogando {ref.title}:",
            "games": self._hybrid_recommendation(reference_game=ref),
        }

    def get_favorite_games_recommendations(self) -> Dict:
        favorites = [ug for ug in self.user_games if ug.favorite]
        if not favorites:
            return None
        ref = random.choice(favorites).game
        return {
            "title": f"Porque você favoritou {ref.title}:",
            "games": self._hybrid_recommendation(reference_game=ref),
        }

    def get_top_rated_recommendations(self) -> Dict:
        rated = [ug for ug in self.user_games if ug.rating is not None]
        if not rated:
            return None
        best = max(rated, key=lambda x: x.rating)
        return {
            "title": f"Baseado na sua nota de {best.game.title}:",
            "games": self._hybrid_recommendation(reference_game=best.game),
        }

    def get_favorite_genres_recommendations(self) -> Dict:
        genre_counts = {}
        for ug in self.user_games:
            for genre in ug.game.genres or []:
                genre_counts[genre] = genre_counts.get(genre, 0) + 1
        if not genre_counts:
            return None
        top_genres = sorted(genre_counts.items(), key=lambda x: x[1], reverse=True)[:2]
        target_genres = [g[0] for g in top_genres]
        genre_str = " e ".join(target_genres)
        return {
            "title": f"Baseado nos seus gêneros favoritos ({genre_str}):",
            "games": self._hybrid_recommendation(genres=target_genres),
        }

    def get_all_recommendations(self) -> List[Dict]:
        recs = [
            self.get_platinum_recommendations(),
            self.get_playing_recommendations(),
            self.get_favorite_genres_recommendations(),
            self.get_favorite_games_recommendations(),
            self.get_top_rated_recommendations(),
        ]
        return [r for r in recs if r is not None]
