from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.dependencies import get_owned_or_raise
from app.models.custom_lists import CustomList
from app.models.game import Game
from app.models.user import User
from app.models.user_game import UserGame
from app.schemas.custom_lists import CustomListCreate, CustomListResponse, CustomListUpdate
from app.security import get_current_user
from app.services.custom_list_service import (
    get_or_create_favorites_list,
    sync_user_game_on_list_removal,
)

router = APIRouter(prefix="/lists", tags=["Custom Lists"])


@router.post("/", response_model=CustomListResponse, status_code=status.HTTP_201_CREATED)
def create_list(
    data: CustomListCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    new_list = CustomList(user_id=current_user.id, name=data.name)
    db.add(new_list)
    db.commit()
    db.refresh(new_list)
    return new_list


@router.get("/me", response_model=List[CustomListResponse])
def get_my_lists(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Retorna as listas customizadas do usuário logado."""
    return get_user_lists(str(current_user.id), db, current_user)


@router.get("/user/{user_id}", response_model=List[CustomListResponse])
def get_user_lists(
    user_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    if str(user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Sem permissão para ver estas listas.")
    get_or_create_favorites_list(user_id, db)
    return (
        db.query(CustomList)
        .options(selectinload(CustomList.games))
        .filter(CustomList.user_id == user_id)
        .all()
    )


@router.delete("/{list_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_list(
    list_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    lst: CustomList = get_owned_or_raise(CustomList, list_id, str(current_user.id), db)
    if lst.is_system is True:
        raise HTTPException(status_code=403, detail="Não é possível eliminar uma lista do sistema.")

    db.delete(lst)
    db.commit()
    return None


@router.post("/{list_id}/games/{game_id}", status_code=status.HTTP_201_CREATED)
def add_game_to_list(
    list_id: str,
    game_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lst: CustomList = get_owned_or_raise(CustomList, list_id, str(current_user.id), db)

    if lst.is_system is True and lst.list_type is not None:
        raise HTTPException(
            status_code=403,
            detail="Não é possível adicionar jogos manualmente a uma lista automática.",
        )

    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Jogo não encontrado.")

    if game in lst.games:
        raise HTTPException(status_code=400, detail="Jogo já está na lista.")

    lst.games.append(game)

    if lst.is_system is True:
        user_game = (
            db.query(UserGame)
            .filter(UserGame.user_id == lst.user_id, UserGame.game_id == game_id)
            .first()
        )
        if user_game:
            setattr(user_game, "favorite", True)

    db.commit()
    return {"ok": True}


@router.delete("/{list_id}/games/{game_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_game_from_list(
    list_id: str,
    game_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lst: CustomList = get_owned_or_raise(CustomList, list_id, str(current_user.id), db)

    game = db.query(Game).filter(Game.id == game_id).first()
    if not game or game not in lst.games:
        raise HTTPException(status_code=404, detail="Jogo não está na lista.")

    if lst.is_system is True and lst.list_type is not None:
        user_game = (
            db.query(UserGame)
            .filter(UserGame.user_id == lst.user_id, UserGame.game_id == game_id)
            .first()
        )
        if user_game:
            sync_user_game_on_list_removal(lst, user_game, db)

    lst.games.remove(game)

    if len(lst.games) == 0 and lst.is_system is True:
        db.delete(lst)

    db.commit()
    return None


@router.put("/{list_id}", response_model=CustomListResponse)
def update_list(
    list_id: str,
    data: CustomListUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lst: CustomList = get_owned_or_raise(CustomList, list_id, str(current_user.id), db)
    if lst.is_system is True:
        raise HTTPException(status_code=403, detail="Não é possível renomear uma lista do sistema.")

    setattr(lst, "name", data.name)
    db.commit()
    db.refresh(lst)
    return lst
