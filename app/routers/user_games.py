import os
import uuid
import json
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List

from app.models.user_game import UserGame
from app.models.user import User
from app.models.game import Game

from app.schemas.game import UserGameCreate, UserGameResponse, UserGameUpdate, LibraryGameResponse
from app.enums.game_status import GameStatus
from app.database import get_db
from app.security import get_current_user


UPLOAD_DIR = "uploads/covers"
os.makedirs(UPLOAD_DIR, exist_ok=True)


router = APIRouter(prefix="/user-games", tags=["User Games"])


@router.post("/", response_model=UserGameResponse, status_code=status.HTTP_201_CREATED)
def add_game_to_library(
    user_game: UserGameCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Adiciona um jogo à biblioteca do usuário logado."""

    game = db.query(Game).filter(Game.id == user_game.game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Jogo não encontrado no catálogo.")

    existing_entry = db.query(UserGame).filter(
        UserGame.user_id == current_user.id,
        UserGame.game_id == user_game.game_id
    ).first()
    
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


@router.get("/user/{user_id}", response_model=List[LibraryGameResponse])
def get_user_library(user_id: str, db: Session = Depends(get_db)):
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
                platforms=game.platforms if isinstance(game.platforms, list) else json.loads(game.platforms or '[]'),
                genres=game.genres if isinstance(game.genres, list) else json.loads(game.genres or '[]'),
                )
            )

    return result


@router.put("/{user_game_id}", response_model=UserGameResponse)
def update_user_game(
    user_game_id: str, 
    game_update: UserGameUpdate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_user_game = db.query(UserGame).filter(UserGame.id == user_game_id).first()
    
    if not db_user_game:
        raise HTTPException(status_code=404, detail="Registro não encontrado na biblioteca.")

    if str(db_user_game.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Você não tem permissão para alterar este jogo.")

    update_data = game_update.model_dump(exclude_unset=True)

    new_status = update_data.get(
        "status",
        db_user_game.status
    )

    if new_status == GameStatus.WANT_TO_PLAY:
        update_data.update({
            "rating": None,
            "started_at": None,
            "finished_at": None,
            "platinum_at": None,
            "hours_played": None,
            "notes": None,
        })
    
    for key, value in update_data.items():
        setattr(db_user_game, key, value)

    db.commit()
    db.refresh(db_user_game)

    return db_user_game


@router.put("/{user_game_id}/cover", response_model=UserGameResponse)
async def update_custom_cover(
    user_game_id: str,
    cover_file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_user_game = db.query(UserGame).filter(UserGame.id == user_game_id).first()
    if not db_user_game:
        raise HTTPException(status_code=404, detail="Registro não encontrado.")
    if str(db_user_game.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Sem permissão.")

    if cover_file.filename and '.' in cover_file.filename:
        extension = cover_file.filename.rsplit('.', 1)[-1].lower()
        if extension not in ('jpg', 'jpeg', 'png', 'gif', 'webp'):
            extension = 'jpg'
    else:
        content_type = cover_file.content_type or 'image/jpeg'
        extension = content_type.split('/')[-1] if '/' in content_type else 'jpg'
        if extension == 'jpeg':
            extension = 'jpg'

    filename = f"{uuid.uuid4()}.{extension}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    with open(file_path, "wb") as f:
        content = await cover_file.read()
        f.write(content)

    cover_url = f"/uploads/covers/{filename}"

    setattr(db_user_game, 'custom_cover_url', cover_url)
    db.commit()
    db.refresh(db_user_game)

    return db_user_game


@router.delete("/{user_game_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_game_from_library(
    user_game_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_user_game = db.query(UserGame).filter(
        UserGame.id == user_game_id
    ).first()

    if not db_user_game:
        raise HTTPException(
            status_code=404,
            detail="Registro não encontrado na biblioteca."
        )

    if str(db_user_game.user_id) != str(current_user.id):
        raise HTTPException(
            status_code=403,
            detail="Você não tem permissão para remover este jogo."
        )

    game = db_user_game.game

    if game.is_manual:
        if str(game.created_by) != str(current_user.id):
            raise HTTPException(
                status_code=403,
                detail="Você não pode remover este jogo."
            )

        db.delete(game)

    else:
        db.delete(db_user_game)

    db.commit()

    return None