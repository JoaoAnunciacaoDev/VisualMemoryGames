from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, cast
from pydantic import BaseModel
from datetime import datetime

from app.models.custom_lists import CustomList
from app.models.game import Game
from app.models.user import User
from app.models.user_game import UserGame
from app.schemas.custom_lists import CustomListCreate, CustomListResponse
from app.database import get_db
from app.security import get_current_user

router = APIRouter(prefix="/lists", tags=["Custom Lists"])


def get_or_create_auto_list(user_id: str, list_type: str, year: int, db: Session) -> CustomList:
    """Cria ou devolve uma lista automática do tipo e ano especificados."""
    name = f"{'Concluídos' if list_type == 'completed_year' else 'Platinados'} {year}"
    lst = db.query(CustomList).filter(
        CustomList.user_id == user_id,
        CustomList.list_type == list_type,
        CustomList.name == name,
        CustomList.is_system
    ).first()
    if not lst:
        lst = CustomList(user_id=user_id, name=name, is_system=True, list_type=list_type)
        db.add(lst)
        db.commit()
        db.refresh(lst)
    return lst


def sync_auto_list(user_id: str, user_game: UserGame, field_name: str, list_type: str, db: Session):
    game = user_game.game
    date_value = getattr(user_game, field_name, None)

    if not date_value:
        existing_lists = db.query(CustomList).filter(
            CustomList.user_id == user_id,
            CustomList.list_type == list_type,
            CustomList.is_system
        ).all()
        for lst in existing_lists:
            if game in lst.games:
                lst.games.remove(game)
                if len(lst.games) == 0:
                    db.delete(lst)
        db.commit()
        return

    year = date_value.year if hasattr(date_value, 'year') else datetime.strptime(str(date_value), "%Y-%m-%d").year

    target_list = get_or_create_auto_list(user_id, list_type, year, db)

    other_lists = db.query(CustomList).filter(
        CustomList.user_id == user_id,
        CustomList.list_type == list_type,
        CustomList.is_system,
        CustomList.id != target_list.id
    ).all()
    for lst in other_lists:
        if game in lst.games:
            lst.games.remove(game)
            if len(lst.games) == 0:
                db.delete(lst)

    if game not in target_list.games:
        target_list.games.append(game)

    db.commit()


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


def get_or_create_favorites_list(user_id: str, db: Session) -> CustomList:
    fav_list = db.query(CustomList).filter(
        CustomList.user_id == user_id,
        CustomList.list_type == "favorites",
        CustomList.is_system
    ).first()
    if not fav_list:
        fav_list = CustomList(user_id=user_id, name="Favoritos", is_system=True, list_type="favorites")
        db.add(fav_list)
        db.commit()
        db.refresh(fav_list)
    return fav_list


@router.get("/user/{user_id}", response_model=List[CustomListResponse])
def get_user_lists(
    user_id: str, db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
    ):
    
    if str(user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Sem permissão para ver estas listas.")
    get_or_create_favorites_list(user_id, db)
    return db.query(CustomList).filter(CustomList.user_id == user_id).all()


@router.delete("/{list_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_list(
    list_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    lst = db.query(CustomList).filter(CustomList.id == list_id).first()
    if lst is None:
        raise HTTPException(status_code=404, detail="Lista não encontrada.")
    if str(lst.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Sem permissão.")
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
    current_user: User = Depends(get_current_user)
):
    lst = db.query(CustomList).filter(CustomList.id == list_id).first()
    if not lst:
        raise HTTPException(status_code=404, detail="Lista não encontrada.")
    if str(lst.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Sem permissão.")

    if lst.is_system is True and lst.list_type is not None:
        raise HTTPException(status_code=403, detail="Não é possível adicionar jogos manualmente a uma lista automática.")

    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Jogo não encontrado.")

    if game in lst.games:
        raise HTTPException(status_code=400, detail="Jogo já está na lista.")

    lst.games.append(game)

    if lst.is_system is True:
        user_game = db.query(UserGame).filter(
            UserGame.user_id == lst.user_id,
            UserGame.game_id == game_id
        ).first()
        if user_game:
            setattr(user_game, 'favorite', True)

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

    if lst.is_system is True and lst.list_type is not None:
        user_game = db.query(UserGame).filter(
            UserGame.user_id == lst.user_id,
            UserGame.game_id == game_id
        ).first()
        
        
        if user_game:
            list_type = cast(str, lst.list_type)
            
            if list_type == "favorites":
                setattr(user_game, 'favorite', False)
            elif list_type == "completed_year":
                setattr(user_game, 'finished_at', None)
            elif list_type == "platinized_year":
                setattr(user_game, 'platinum_at', None)

    lst.games.remove(game)

    if len(lst.games) == 0 and lst.is_system is True:
        db.delete(lst)

    db.commit()
    return None


class CustomListUpdate(BaseModel):
    name: str


@router.put("/{list_id}", response_model=CustomListResponse)
def update_list(
    list_id: str,
    data: CustomListUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    lst = db.query(CustomList).filter(CustomList.id == list_id).first()
    if lst is None:
        raise HTTPException(status_code=404, detail="Lista não encontrada.")
    if str(lst.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Sem permissão.")
    if lst.is_system is True:
        raise HTTPException(status_code=403, detail="Não é possível renomear uma lista do sistema.")

    setattr(lst, 'name', data.name)
    db.commit()
    db.refresh(lst)
    return lst