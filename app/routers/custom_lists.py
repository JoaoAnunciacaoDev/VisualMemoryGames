from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.models.custom_lists import CustomList
from app.models.game import Game
from app.models.user import User
from app.schemas.custom_lists import CustomListCreate, CustomListResponse
from app.database import get_db
from app.security import get_current_user

router = APIRouter(prefix="/lists", tags=["Custom Lists"])


@router.post("/", response_model=CustomListResponse, status_code=status.HTTP_201_CREATED)
def create_list(
    data: CustomListCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_list = CustomList(user_id=current_user.id, name=data.name)
    db.add(new_list)
    db.commit()
    db.refresh(new_list)
    return new_list


@router.get("/user/{user_id}", response_model=List[CustomListResponse])
def get_user_lists(user_id: str, db: Session = Depends(get_db)):
    return db.query(CustomList).filter(CustomList.user_id == user_id).all()


@router.delete("/{list_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_list(
    list_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    lst = db.query(CustomList).filter(CustomList.id == list_id).first()
    if not lst:
        raise HTTPException(status_code=404, detail="Lista não encontrada.")
    if str(lst.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Sem permissão.")
    db.delete(lst)
    db.commit()
    return None


@router.post("/{list_id}/games/{game_id}", status_code=status.HTTP_201_CREATED)
def add_game_to_list(
    list_id: str,
    game_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    lst = db.query(CustomList).filter(CustomList.id == list_id).first()
    if not lst:
        raise HTTPException(status_code=404, detail="Lista não encontrada.")
    if str(lst.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Sem permissão.")

    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Jogo não encontrado.")

    if game in lst.games:
        raise HTTPException(status_code=400, detail="Jogo já está na lista.")

    lst.games.append(game)
    db.commit()
    return {"ok": True}


@router.delete("/{list_id}/games/{game_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_game_from_list(
    list_id: str,
    game_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    lst = db.query(CustomList).filter(CustomList.id == list_id).first()
    if not lst:
        raise HTTPException(status_code=404, detail="Lista não encontrada.")
    if str(lst.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Sem permissão.")

    game = db.query(Game).filter(Game.id == game_id).first()
    if not game or game not in lst.games:
        raise HTTPException(status_code=404, detail="Jogo não está na lista.")

    lst.games.remove(game)
    db.commit()
    return None