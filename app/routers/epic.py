from typing import List

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.activity import Activity
from app.models.game import Game
from app.models.user import User
from app.models.user_game import UserGame
from app.security import get_current_user

router = APIRouter(prefix="/users/me/epic", tags=["Epic Games Integration"])


class EpicImportRequest(BaseModel):
    titles: List[str] = Field(..., description="Lista de nomes de jogos a serem importados")


class EpicImportResponse(BaseModel):
    imported_count: int
    skipped_count: int
    total_received: int


@router.post(
    "/import",
    response_model=EpicImportResponse,
    status_code=status.HTTP_200_OK,
    summary="Importa uma lista de jogos da Epic Games para a biblioteca do usuário",
)
def import_epic_games(
    payload: EpicImportRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Importa jogos da Epic Games Store a partir de títulos extraídos via arquivo/texto.
    - Se o jogo já existir no catálogo global, vincula. Caso contrário, cria no catálogo.
    - Se o usuário já tiver o jogo na biblioteca, não sobrescreve e contabiliza como ignorado.
    - Jogos novos entram como store='EPIC', status='Quero Jogar' e hours_played=0.0.
    """
    raw_titles = payload.titles
    total_received = len(raw_titles)

    # Limpa e deduplica os títulos mantendo a ordem
    cleaned_titles_map = {}
    for title in raw_titles:
        if not title:
            continue
        clean = title.strip()
        if not clean:
            continue
        key = clean.lower()
        if key not in cleaned_titles_map:
            cleaned_titles_map[key] = clean

    if not cleaned_titles_map:
        return EpicImportResponse(
            imported_count=0,
            skipped_count=0,
            total_received=total_received,
        )

    # 1. Pré-carrega jogos existentes no catálogo em lotes de 500
    keys_list = list(cleaned_titles_map.keys())
    existing_games = {}
    for i in range(0, len(keys_list), 500):
        chunk = keys_list[i : i + 500]
        found = db.query(Game).filter(func.lower(Game.title).in_(chunk)).all()
        for g_db in found:
            existing_games[g_db.title.lower().strip()] = g_db

    # 2. Pré-carrega jogos da biblioteca do usuário
    user_games_map = {
        ug.game_id: ug
        for ug in db.query(UserGame).filter(UserGame.user_id == current_user.id).all()
    }

    imported_count = 0
    skipped_count = 0

    for key, clean_title in cleaned_titles_map.items():
        # Procura se o jogo já existe globalmente no catálogo
        game = existing_games.get(key)
        if not game:
            game = Game(
                title=clean_title,
                cover_url=None,
                platforms=["PC"],
                genres=[],
                release_year=None,
                is_manual=False,
            )
            db.add(game)
            db.flush()
            existing_games[key] = game

        # Verifica se o usuário já possui este jogo na biblioteca
        user_game = user_games_map.get(game.id)
        if not user_game:
            user_game = UserGame(
                user_id=current_user.id,
                game_id=game.id,
                game=game,
                rating=None,
                status="Quero Jogar",
                hours_played=0.0,
                store="EPIC",
                acquired_at=None,
                platinum_at=None,
                favorite=False,
            )
            db.add(user_game)
            user_games_map[game.id] = user_game
            imported_count += 1

            # Registra atividade de adição
            db.add(
                Activity(
                    user_id=str(current_user.id),
                    game_id=str(game.id),
                    action_type="ADDED",
                )
            )
        else:
            if not user_game.store:
                user_game.store = "EPIC"
            skipped_count += 1

    # Contabiliza também entradas duplicadas recebidas no payload original como skipped
    duplicates_in_payload = total_received - len(cleaned_titles_map)
    skipped_count += duplicates_in_payload

    db.commit()

    return EpicImportResponse(
        imported_count=imported_count,
        skipped_count=skipped_count,
        total_received=total_received,
    )
