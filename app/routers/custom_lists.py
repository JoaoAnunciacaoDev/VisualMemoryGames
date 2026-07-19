from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.dependencies import get_owned_or_raise
from app.models.custom_lists import CustomList, CustomListGame
from app.models.game import Game
from app.models.user import User
from app.models.user_game import UserGame
from app.schemas.custom_lists import (
    CustomListCreate,
    CustomListResponse,
    CustomListUpdate,
    ReorderGamesRequest,
)
from app.security import get_current_user
from app.services.custom_list_service import (
    get_or_create_favorites_list,
    sync_user_game_on_list_removal,
)

router = APIRouter(prefix="/lists", tags=["Custom Lists"])


def serialize_custom_list(lst: CustomList) -> dict:
    sorted_list_games = sorted(lst.list_games, key=lambda lg: lg.order_index)
    games_data = []
    for lg in sorted_list_games:
        game = lg.game
        games_data.append({
            "id": game.id,
            "title": game.title,
            "cover_url": game.cover_url,
            "custom_cover_url": getattr(game, "custom_cover_url", None),
            "external_id": game.external_id,
            "order_index": lg.order_index,
        })
    return {
        "id": lst.id,
        "user_id": lst.user_id,
        "name": lst.name,
        "is_system": lst.is_system,
        "list_type": lst.list_type,
        "games": games_data,
    }


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
    return serialize_custom_list(new_list)


@router.get("/me", response_model=List[CustomListResponse])
def get_my_lists(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Retorna as listas customizadas do usuário logado."""
    return get_user_lists(str(current_user.id), db, current_user)


def inject_custom_covers_to_lists(lists: List[CustomList], db: Session, user_id: str) -> None:
    user_games_data = (
        db.query(UserGame.game_id, UserGame.custom_cover_url)
        .filter(UserGame.user_id == user_id)
        .all()
    )
    custom_covers = {
        game_id: custom_cover_url
        for game_id, custom_cover_url in user_games_data
        if custom_cover_url is not None and str(custom_cover_url).strip() != ""
    }
    for lst in lists:
        for lg in lst.list_games:
            game = lg.game
            if game and game.id in custom_covers:
                setattr(game, "custom_cover_url", custom_covers[game.id])


@router.get("/user/{user_id}", response_model=List[CustomListResponse])
def get_user_lists(
    user_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    if str(user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Sem permissão para ver estas listas.")
    get_or_create_favorites_list(user_id, db)
    lists = (
        db.query(CustomList)
        .options(selectinload(CustomList.list_games).joinedload(CustomListGame.game))
        .filter(CustomList.user_id == user_id)
        .all()
    )
    inject_custom_covers_to_lists(lists, db, user_id)
    return [serialize_custom_list(lst) for lst in lists]


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

    exists = (
        db.query(CustomListGame)
        .filter(CustomListGame.custom_list_id == lst.id, CustomListGame.game_id == game_id)
        .first()
        is not None
    )
    if exists:
        raise HTTPException(status_code=400, detail="Jogo já está na lista.")

    # Calculate next order_index
    max_order = -1
    if lst.list_games:
        max_order = max(lg.order_index for lg in lst.list_games)
    next_order = max_order + 1

    new_list_game = CustomListGame(
        custom_list_id=lst.id,
        game_id=game.id,
        order_index=next_order
    )
    db.add(new_list_game)

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
    inject_custom_covers_to_lists([lst], db, str(current_user.id))
    return serialize_custom_list(lst)


@router.put("/{list_id}/reorder", response_model=CustomListResponse)
def reorder_list_games(
    list_id: str,
    data: ReorderGamesRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lst: CustomList = get_owned_or_raise(CustomList, list_id, str(current_user.id), db)

    # Get all CustomListGame entries for this list
    list_games = db.query(CustomListGame).filter(CustomListGame.custom_list_id == lst.id).all()
    list_games_by_game_id = {lg.game_id: lg for lg in list_games}

    # Update order_index for each game ID in the request
    for index, game_id in enumerate(data.game_ids):
        if game_id in list_games_by_game_id:
            list_games_by_game_id[game_id].order_index = index

    # For any games not specified in the request payload, we keep their order at the end
    assigned_ids = set(data.game_ids)
    remaining_games = [lg for lg in list_games if lg.game_id not in assigned_ids]

    current_index = len(data.game_ids)
    for lg in remaining_games:
        lg.order_index = current_index
        current_index += 1

    db.commit()
    db.refresh(lst)
    inject_custom_covers_to_lists([lst], db, str(current_user.id))
    return serialize_custom_list(lst)
