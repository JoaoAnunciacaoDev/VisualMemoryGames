import asyncio
from typing import List

from fastapi import APIRouter, BackgroundTasks, Depends, status
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import SessionLocal, get_db
from app.models.activity import Activity
from app.models.custom_lists import CustomList, custom_list_games
from app.models.game import Game
from app.models.tierlist import TierCategory, TierItem, TierList
from app.models.user import User
from app.models.user_game import UserGame
from app.security import get_current_user
from app.services.custom_list_service import cleanup_empty_auto_lists
from app.services.game_provider import RAWG_API_KEY, search_games_on_rawg
from app.services.igdb_service import search_games_on_igdb

router = APIRouter(prefix="/users/me/epic", tags=["Epic Games Integration"])
db_session_maker = SessionLocal


class EpicImportRequest(BaseModel):
    titles: List[str] = Field(..., description="Lista de nomes de jogos a serem importados")


class EpicImportResponse(BaseModel):
    imported_count: int
    skipped_count: int
    total_received: int


async def enrich_games_metadata_in_background(game_ids: List[str]):
    """Busca capas, gêneros e detalhes de jogos a partir do título
    via IGDB/RAWG em segundo plano.
    """
    if not game_ids:
        return

    for game_id in game_ids:
        title = None
        db = db_session_maker()
        try:
            game = db.query(Game).filter(Game.id == game_id).first()
            if game:
                needs_cover = not game.cover_url
                needs_genres = not game.genres or game.genres == [] or game.genres == "[]"
                needs_year = not game.release_year
                if needs_cover or needs_genres or needs_year:
                    title = game.title
        finally:
            db.close()

        if not title:
            continue

        # Busca metadados fora da sessão do banco
        found_data = None
        try:
            # 1. Tenta IGDB
            igdb_results = search_games_on_igdb(title, limit=1)
            if igdb_results:
                found_data = igdb_results[0]
            elif RAWG_API_KEY:
                # 2. Tenta RAWG
                rawg_results = search_games_on_rawg(title, page=1)
                if rawg_results:
                    found_data = rawg_results[0]
        except Exception as e:
            print(f"Erro ao buscar metadados para '{title}': {e}")

        if found_data:
            db = db_session_maker()
            try:
                game = db.query(Game).filter(Game.id == game_id).first()
                if game:
                    if not game.cover_url and found_data.get("cover_url"):
                        game.cover_url = found_data["cover_url"]
                    if (
                        not game.genres or game.genres == [] or game.genres == "[]"
                    ) and found_data.get("genres"):
                        game.genres = found_data["genres"]
                    if not game.release_year and found_data.get("release_year"):
                        game.release_year = found_data["release_year"]
                    if game.external_id is None and found_data.get("external_id") is not None:
                        existing_ext = (
                            db.query(Game)
                            .filter(Game.external_id == found_data["external_id"])
                            .first()
                        )
                        if not existing_ext:
                            game.external_id = found_data["external_id"]
                    db.commit()
            except Exception as e:
                print(f"Erro ao salvar metadados para '{title}': {e}")
            finally:
                db.close()

        # Intervalo para respeitar rate limits das APIs externas
        await asyncio.sleep(0.5)


@router.post(
    "/import",
    response_model=EpicImportResponse,
    status_code=status.HTTP_200_OK,
    summary="Importa uma lista de jogos da Epic Games para a biblioteca do usuário",
)
def import_epic_games(
    payload: EpicImportRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Importa jogos da Epic Games Store a partir de títulos extraídos via arquivo/texto.
    - Se o jogo já existir no catálogo global, vincula. Caso contrário, cria no catálogo.
    - Se o usuário já tiver o jogo na biblioteca, não sobrescreve e contabiliza como ignorado.
    - Jogos novos entram como store='EPIC', status='Na biblioteca' e hours_played=0.0.
    - Dispara tarefa em background para buscar capas e gêneros faltantes.
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
    game_ids_to_enrich = []

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
            game_ids_to_enrich.append(game.id)
        elif not game.cover_url or not game.genres or game.genres == [] or game.genres == "[]":
            game_ids_to_enrich.append(game.id)

        # Verifica se o usuário já possui este jogo na biblioteca
        user_game = user_games_map.get(game.id)
        if not user_game:
            user_game = UserGame(
                user_id=current_user.id,
                game_id=game.id,
                game=game,
                rating=None,
                status="Na biblioteca",
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

    if game_ids_to_enrich:
        background_tasks.add_task(enrich_games_metadata_in_background, game_ids_to_enrich)

    return EpicImportResponse(
        imported_count=imported_count,
        skipped_count=skipped_count,
        total_received=total_received,
    )


@router.post(
    "/enrich",
    status_code=status.HTTP_200_OK,
    summary="Atualiza metadados (capas e gêneros) de jogos da Epic Games da biblioteca",
)
def enrich_epic_games(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Localiza jogos da Epic Games do usuário que estão sem capa ou gêneros
    e agenda o enriquecimento em segundo plano.
    """
    user_games = (
        db.query(UserGame)
        .join(Game)
        .filter(UserGame.user_id == current_user.id, UserGame.store == "EPIC")
        .all()
    )

    game_ids_to_enrich = []
    for ug in user_games:
        g = ug.game
        if not g.cover_url or not g.genres or g.genres == [] or g.genres == "[]":
            game_ids_to_enrich.append(g.id)

    if game_ids_to_enrich:
        background_tasks.add_task(enrich_games_metadata_in_background, game_ids_to_enrich)

    return {
        "message": f"Enriquecimento iniciado para {len(game_ids_to_enrich)} jogos.",
        "games_to_enrich_count": len(game_ids_to_enrich),
    }


@router.delete(
    "/games",
    status_code=status.HTTP_200_OK,
    summary="Remove todos os jogos importados da Epic Games da biblioteca do usuário",
)
def remove_epic_games(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Remove todos os jogos associados à Epic Games da biblioteca do usuário.
    Limpa referências em listas personalizadas, tierlists e listas automáticas.
    """
    epic_user_games_query = db.query(UserGame).filter(
        UserGame.user_id == current_user.id,
        UserGame.store == "EPIC",
    )
    epic_games = epic_user_games_query.all()
    removed_count = len(epic_games)

    if removed_count > 0:
        game_ids = [ug.game_id for ug in epic_games]

        # Deleta associações em listas personalizadas
        db.execute(
            custom_list_games.delete().where(
                custom_list_games.c.game_id.in_(game_ids),
                custom_list_games.c.custom_list_id.in_(
                    db.query(CustomList.id).filter(CustomList.user_id == current_user.id)
                ),
            )
        )

        # Deleta itens em Tier Lists
        db.query(TierItem).filter(
            TierItem.game_id.in_(game_ids),
            TierItem.category_id.in_(
                db.query(TierCategory.id)
                .join(TierList)
                .filter(TierList.user_id == current_user.id)
            ),
        ).delete(synchronize_session=False)

        # Deleta os registros em UserGame
        epic_user_games_query.delete(synchronize_session=False)
        db.commit()

        cleanup_empty_auto_lists(current_user.id, db)

    return {
        "message": f"{removed_count} jogos da Epic Games foram removidos com sucesso.",
        "removed_count": removed_count,
    }
