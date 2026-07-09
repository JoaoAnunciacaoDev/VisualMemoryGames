from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_owned_or_raise
from app.enums.game_status import GameStatus
from app.models.game import Game
from app.models.user import User
from app.models.user_game import UserGame
from app.schemas.game import (
    LibraryGameResponse,
    UserGameBase,
    UserGameCreate,
    UserGameResponse,
    UserGameUpdate,
)
from app.security import get_current_user
from app.services.custom_list_service import get_or_create_favorites_list, sync_auto_list
from app.services.library_service import remove_from_library
from app.services.storage import save_upload_file
from app.utils import safe_load_json_list

MAX_FILE_SIZE = 5 * 1024 * 1024

router = APIRouter(prefix="/user-games", tags=["User Games"])


@router.post("/", response_model=UserGameResponse, status_code=status.HTTP_201_CREATED)
def add_game_to_library(
    user_game: UserGameCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Adiciona um jogo à biblioteca do usuário logado."""

    game = db.query(Game).filter(Game.id == user_game.game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Jogo não encontrado no catálogo.")

    existing_entry = (
        db.query(UserGame)
        .filter(UserGame.user_id == current_user.id, UserGame.game_id == user_game.game_id)
        .first()
    )

    if existing_entry:
        raise HTTPException(status_code=400, detail="Este jogo já está na sua biblioteca.")

    data = user_game.model_dump(exclude_none=True)

    new_entry = UserGame(
        user_id=current_user.id,
        **data,
    )

    db.add(new_entry)
    db.commit()
    db.refresh(new_entry)

    return new_entry


@router.get("/me", response_model=List[LibraryGameResponse])
def get_my_library(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Retorna os jogos da biblioteca do usuário logado."""
    return get_user_library(str(current_user.id), db, current_user)


@router.get("/user/{user_id}", response_model=List[LibraryGameResponse])
def get_user_library(
    user_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    if str(user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Sem permissão para ver esta biblioteca.")

    library = (
        db.query(UserGame, Game)
        .join(Game, Game.id == UserGame.game_id)
        .filter(UserGame.user_id == user_id)
        .all()
    )

    result = []
    for user_game, game in library:
        result.append(
            LibraryGameResponse(
                id=user_game.id,
                user_id=str(user_game.user_id),
                game_id=str(user_game.game_id),
                external_id=game.external_id,
                title=game.title,
                cover_url=game.cover_url,
                release_year=game.release_year,
                rating=user_game.rating,
                status=user_game.status,
                started_at=user_game.started_at,
                finished_at=user_game.finished_at,
                acquired_at=user_game.acquired_at,
                platinum_at=user_game.platinum_at,
                hours_played=user_game.hours_played,
                store=user_game.store,
                custom_cover_url=user_game.custom_cover_url,
                favorite=user_game.favorite,
                notes=user_game.notes,
                is_manual=game.is_manual,
                platforms=safe_load_json_list(game.platforms),
                genres=safe_load_json_list(game.genres),
            )
        )

    return result


@router.put("/{user_game_id}", response_model=UserGameResponse)
def update_user_game(
    user_game_id: str,
    game_update: UserGameUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_user_game: UserGame = get_owned_or_raise(UserGame, user_game_id, str(current_user.id), db)

    update_data = game_update.model_dump(exclude_unset=True)

    new_status = update_data.get("status", db_user_game.status)

    validation_data = {
        "rating": db_user_game.rating,
        "status": db_user_game.status,
        "started_at": db_user_game.started_at,
        "finished_at": db_user_game.finished_at,
        "acquired_at": db_user_game.acquired_at,
        "platinum_at": db_user_game.platinum_at,
        "hours_played": db_user_game.hours_played,
        "store": db_user_game.store,
        "custom_cover_url": db_user_game.custom_cover_url,
        "favorite": db_user_game.favorite,
        "notes": db_user_game.notes,
    }

    validation_data.update(update_data)

    if new_status == GameStatus.WANT_TO_PLAY:
        validation_data.update(
            {
                "rating": None,
                "started_at": None,
                "finished_at": None,
                "platinum_at": None,
                "hours_played": None,
                "notes": None,
            }
        )

    from pydantic import ValidationError
    try:
        UserGameBase(**validation_data)
    except ValidationError as e:
        error_messages = []
        for error in e.errors():
            msg = error.get("msg", "")
            if msg.startswith("Value error, "):
                msg = msg[len("Value error, "):]
            error_messages.append(msg)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="; ".join(error_messages)
        )

    if new_status == GameStatus.WANT_TO_PLAY:
        update_data.update(
            {
                "rating": None,
                "started_at": None,
                "finished_at": None,
                "platinum_at": None,
                "hours_played": None,
                "notes": None,
            }
        )

    for key, value in update_data.items():
        setattr(db_user_game, key, value)

    if "favorite" in update_data:
        fav_list = get_or_create_favorites_list(str(db_user_game.user_id), db)
        game = db_user_game.game
        if update_data["favorite"]:
            if game not in fav_list.games:
                fav_list.games.append(game)
        else:
            if game in fav_list.games:
                fav_list.games.remove(game)

    db.commit()
    db.refresh(db_user_game)

    if "finished_at" in update_data:
        sync_auto_list(
            user_id=str(db_user_game.user_id),
            user_game=db_user_game,
            field_name="finished_at",
            list_type="completed_year",
            db=db,
        )

    if "platinum_at" in update_data:
        sync_auto_list(
            user_id=str(db_user_game.user_id),
            user_game=db_user_game,
            field_name="platinum_at",
            list_type="platinized_year",
            db=db,
        )

    return db_user_game


@router.put("/{user_game_id}/cover", response_model=UserGameResponse)
async def update_custom_cover(
    user_game_id: str,
    cover_file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_user_game: UserGame = get_owned_or_raise(UserGame, user_game_id, str(current_user.id), db)

    if cover_file.size and cover_file.size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="A imagem deve ter no máximo 5 MB.")

    cover_url = await save_upload_file(cover_file)

    setattr(db_user_game, "custom_cover_url", cover_url)
    db.commit()
    db.refresh(db_user_game)

    return db_user_game


@router.delete("/{user_game_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_game_from_library(
    user_game_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    db_user_game: UserGame = get_owned_or_raise(UserGame, user_game_id, str(current_user.id), db)
    remove_from_library(db_user_game, current_user, db)
    return None
