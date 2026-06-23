from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.models.user_game import UserGame
from app.models.user import User
from app.models.game import Game

from app.schemas.game import UserGameCreate, UserGameResponse, UserGameUpdate
from app.database import get_db
from app.security import get_current_user


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

    new_entry = UserGame(
        user_id=current_user.id,
        game_id=user_game.game_id,
        rating=user_game.rating,
        status=user_game.status,
        played_year=user_game.played_year,
        notes=user_game.notes
    )

    db.add(new_entry)
    db.commit()
    db.refresh(new_entry)

    return new_entry


@router.get("/user/{user_id}", response_model=List[UserGameResponse])
def get_user_library(user_id: str, db: Session = Depends(get_db)):
    """Retorna todos os jogos da biblioteca de um usuário específico."""

    library = (
        db.query(UserGame, Game.external_id)
        .join(Game, Game.id == UserGame.game_id)
        .filter(UserGame.user_id == user_id)
        .all()
    )

    result = []
    for user_game, external_id in library:
        user_game.external_id = external_id
        result.append(user_game)

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
    for key, value in update_data.items():
        setattr(db_user_game, key, value)

    db.commit()
    db.refresh(db_user_game)

    return db_user_game

@router.delete("/{user_game_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_game_from_library(
    user_game_id: str, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_user_game = db.query(UserGame).filter(UserGame.id == user_game_id).first()
    
    if not db_user_game:
        raise HTTPException(status_code=404, detail="Registro não encontrado na biblioteca.")

    if str(db_user_game.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Você não tem permissão para remover este jogo.")
        
    db.delete(db_user_game)
    db.commit()
    
    return None