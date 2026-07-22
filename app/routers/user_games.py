from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_owned_or_raise
from app.enums.game_status import GameStatus
from app.models.activity import Activity
from app.models.game import Game
from app.models.user import User
from app.models.user_game import UserGame
from app.models.user_game_review import UserGameReview
from app.schemas.game import (
    LibraryGameResponse,
    UserGameBase,
    UserGameCreate,
    UserGameResponse,
    UserGameUpdate,
)
from app.schemas.user_game_review import (
    UserGameReviewCreate,
    UserGameReviewResponse,
    UserGameReviewUpdate,
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

    # Gerar atividade de adição
    activity = Activity(user_id=current_user.id, game_id=user_game.game_id, action_type="ADDED")
    db.add(activity)

    db.commit()
    db.refresh(new_entry)

    return new_entry


@router.get("/me", response_model=List[LibraryGameResponse])
def get_my_library(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Retorna os jogos da biblioteca do usuário logado."""
    return get_user_library(str(current_user.id), db, current_user)


@router.get("/user/{identifier}", response_model=List[LibraryGameResponse])
def get_user_library(
    identifier: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    from sqlalchemy import func

    target_user = (
        db.query(User)
        .filter((User.id == identifier) | (func.lower(User.username) == func.lower(identifier)))
        .first()
    )
    if not target_user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    from app.models.follow import Follow

    is_following = (
        db.query(Follow)
        .filter(Follow.follower_id == current_user.id, Follow.following_id == target_user.id)
        .first()
        is not None
    )

    if (
        not target_user.is_public
        and not current_user.is_admin
        and not is_following
        and target_user.id != current_user.id
    ):
        raise HTTPException(status_code=403, detail="Sem permissão para ver esta biblioteca.")

    library = (
        db.query(UserGame, Game)
        .join(Game, Game.id == UserGame.game_id)
        .filter(UserGame.user_id == target_user.id)
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
                msg = msg[len("Value error, ") :]
            error_messages.append(msg)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="; ".join(error_messages)
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

    old_status = db_user_game.status
    old_rating = db_user_game.rating
    old_platinum = db_user_game.platinum_at

    for key, value in update_data.items():
        setattr(db_user_game, key, value)

    # Manter a tabela de reviews sincronizada caso rating ou notes sejam editados via PUT herdado
    if "rating" in update_data or "notes" in update_data:
        latest_review = (
            db.query(UserGameReview)
            .filter(UserGameReview.user_game_id == db_user_game.id)
            .order_by(UserGameReview.created_at.desc())
            .first()
        )
        new_rating = update_data.get("rating", db_user_game.rating)
        new_notes = update_data.get("notes", db_user_game.notes)
        if new_rating is not None or new_notes is not None:
            if latest_review:
                latest_review.rating = new_rating
                latest_review.notes = new_notes
                latest_review.updated_at = datetime.now()
            else:
                db.add(
                    UserGameReview(
                        user_game_id=db_user_game.id,
                        rating=new_rating,
                        notes=new_notes,
                    )
                )
        elif latest_review:
            db.delete(latest_review)

    # Verificar atividades
    if old_status != db_user_game.status:
        db.add(
            Activity(
                user_id=str(current_user.id),
                game_id=db_user_game.game_id,
                action_type="UPDATED_STATUS",
                context=db_user_game.status,
            )
        )
    if old_rating != db_user_game.rating and db_user_game.rating is not None:
        db.add(
            Activity(
                user_id=str(current_user.id),
                game_id=db_user_game.game_id,
                action_type="RATED",
                context=str(db_user_game.rating),
            )
        )
    if old_platinum != db_user_game.platinum_at and db_user_game.platinum_at is not None:
        db.add(
            Activity(
                user_id=str(current_user.id), game_id=db_user_game.game_id, action_type="PLATINUM"
            )
        )

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


def sync_user_game_latest_review(user_game: UserGame, db: Session):
    """Sincroniza o rating e notes do UserGame com a avaliação mais recente."""
    latest_review = (
        db.query(UserGameReview)
        .filter(UserGameReview.user_game_id == user_game.id)
        .order_by(UserGameReview.created_at.desc())
        .first()
    )
    if latest_review:
        user_game.rating = latest_review.rating
        user_game.notes = latest_review.notes
    else:
        user_game.rating = None
        user_game.notes = None


@router.get("/{user_game_id}/reviews", response_model=List[UserGameReviewResponse])
def get_user_game_reviews(
    user_game_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Obtém todas as avaliações de um jogo específico da biblioteca do usuário."""
    db_user_game = db.query(UserGame).filter(UserGame.id == user_game_id).first()
    if not db_user_game:
        raise HTTPException(status_code=404, detail="Jogo não encontrado na biblioteca.")

    # Verificar visibilidade da biblioteca
    target_user = db_user_game.user
    is_following = False
    if current_user.id != target_user.id:
        from app.models.follow import Follow

        is_following = (
            db.query(Follow)
            .filter(Follow.follower_id == current_user.id, Follow.followed_id == target_user.id)
            .first()
            is not None
        )

    if (
        not target_user.is_public
        and not current_user.is_admin
        and not is_following
        and target_user.id != current_user.id
    ):
        raise HTTPException(status_code=403, detail="Sem permissão para ver estas avaliações.")

    reviews = (
        db.query(UserGameReview)
        .filter(UserGameReview.user_game_id == user_game_id)
        .order_by(UserGameReview.created_at.desc())
        .all()
    )
    return reviews


@router.post(
    "/{user_game_id}/reviews",
    response_model=UserGameReviewResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_user_game_review(
    user_game_id: str,
    review: UserGameReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cria uma nova avaliação para um jogo da biblioteca."""
    db_user_game: UserGame = get_owned_or_raise(UserGame, user_game_id, str(current_user.id), db)

    if db_user_game.status == GameStatus.WANT_TO_PLAY:
        raise HTTPException(status_code=400, detail="Mude o status para avaliar o jogo.")

    db_review = UserGameReview(
        user_game_id=db_user_game.id,
        rating=review.rating,
        notes=review.notes,
    )
    db.add(db_review)
    db.flush()

    sync_user_game_latest_review(db_user_game, db)

    db.commit()
    db.refresh(db_review)
    return db_review


@router.put("/{user_game_id}/reviews/{review_id}", response_model=UserGameReviewResponse)
def update_user_game_review(
    user_game_id: str,
    review_id: str,
    review_update: UserGameReviewUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Atualiza uma avaliação existente."""
    db_user_game: UserGame = get_owned_or_raise(UserGame, user_game_id, str(current_user.id), db)

    db_review = (
        db.query(UserGameReview)
        .filter(UserGameReview.id == review_id, UserGameReview.user_game_id == db_user_game.id)
        .first()
    )
    if not db_review:
        raise HTTPException(status_code=404, detail="Avaliação não encontrada.")

    update_data = review_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_review, key, value)

    db_review.updated_at = datetime.now()
    db.flush()

    sync_user_game_latest_review(db_user_game, db)

    db.commit()
    db.refresh(db_review)
    return db_review


@router.delete("/{user_game_id}/reviews/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user_game_review(
    user_game_id: str,
    review_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove uma avaliação."""
    db_user_game: UserGame = get_owned_or_raise(UserGame, user_game_id, str(current_user.id), db)

    db_review = (
        db.query(UserGameReview)
        .filter(UserGameReview.id == review_id, UserGameReview.user_game_id == db_user_game.id)
        .first()
    )
    if not db_review:
        raise HTTPException(status_code=404, detail="Avaliação não encontrada.")

    db.delete(db_review)
    db.flush()

    sync_user_game_latest_review(db_user_game, db)

    db.commit()
    return status.HTTP_204_NO_CONTENT
