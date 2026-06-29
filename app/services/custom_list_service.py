from datetime import datetime
from typing import cast

from sqlalchemy.orm import Session

from app.models.custom_lists import CustomList
from app.models.user_game import UserGame


def get_or_create_favorites_list(user_id: str, db: Session) -> CustomList:
    """Retorna (ou cria) a lista de Favoritos do sistema para um utilizador."""
    fav_list = (
        db.query(CustomList)
        .filter(
            CustomList.user_id == user_id,
            CustomList.list_type == "favorites",
            CustomList.is_system,
        )
        .first()
    )
    if not fav_list:
        fav_list = CustomList(
            user_id=user_id, name="Favoritos", is_system=True, list_type="favorites"
        )
        db.add(fav_list)
        db.commit()
        db.refresh(fav_list)
    return fav_list


def get_or_create_auto_list(user_id: str, list_type: str, year: int, db: Session) -> CustomList:
    """Cria ou devolve uma lista automática do tipo e ano especificados."""
    name = f"{'Concluídos' if list_type == 'completed_year' else 'Platinados'} {year}"
    lst = (
        db.query(CustomList)
        .filter(
            CustomList.user_id == user_id,
            CustomList.list_type == list_type,
            CustomList.name == name,
            CustomList.is_system,
        )
        .first()
    )
    if not lst:
        lst = CustomList(user_id=user_id, name=name, is_system=True, list_type=list_type)
        db.add(lst)
        db.commit()
        db.refresh(lst)
    return lst


def sync_auto_list(
    user_id: str, user_game: UserGame, field_name: str, list_type: str, db: Session
) -> None:
    """Sincroniza a lista automática anual (concluídos/platinados) com base no campo de data."""
    game = user_game.game
    date_value = getattr(user_game, field_name, None)

    if not date_value:
        existing_lists = (
            db.query(CustomList)
            .filter(
                CustomList.user_id == user_id,
                CustomList.list_type == list_type,
                CustomList.is_system,
            )
            .all()
        )
        for lst in existing_lists:
            if game in lst.games:
                lst.games.remove(game)
                if len(lst.games) == 0:
                    db.delete(lst)
        db.commit()
        return

    year = (
        date_value.year
        if hasattr(date_value, "year")
        else datetime.strptime(str(date_value), "%Y-%m-%d").year
    )

    target_list = get_or_create_auto_list(user_id, list_type, year, db)

    other_lists = (
        db.query(CustomList)
        .filter(
            CustomList.user_id == user_id,
            CustomList.list_type == list_type,
            CustomList.is_system,
            CustomList.id != target_list.id,
        )
        .all()
    )
    for lst in other_lists:
        if game in lst.games:
            lst.games.remove(game)
            if len(lst.games) == 0:
                db.delete(lst)

    if game not in target_list.games:
        target_list.games.append(game)

    db.commit()


def sync_user_game_on_list_removal(lst: CustomList, user_game: UserGame, db: Session) -> None:
    """Reverte campos do UserGame ao remover um jogo de uma lista automática do sistema."""
    list_type = cast(str, lst.list_type)

    if list_type == "favorites":
        setattr(user_game, "favorite", False)
    elif list_type == "completed_year":
        setattr(user_game, "finished_at", None)
    elif list_type == "platinized_year":
        setattr(user_game, "platinum_at", None)

    db.commit()
