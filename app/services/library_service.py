from fastapi import HTTPException
from sqlalchemy.orm import Session, selectinload

from app.models.custom_lists import CustomList
from app.models.user import User
from app.models.user_game import UserGame
from app.services.custom_list_service import cleanup_empty_auto_lists


def remove_from_library(db_user_game: UserGame, current_user: User, db: Session) -> None:
    """Remove um jogo da biblioteca do utilizador, fazendo a limpeza de listas e do jogo manual."""
    game = db_user_game.game

    lists = (
        db.query(CustomList)
        .options(selectinload(CustomList.list_games))
        .filter(CustomList.user_id == current_user.id)
        .all()
    )
    for lst in lists:
        if game in lst.games:
            lst.games.remove(game)

    cleanup_empty_auto_lists(current_user.id, db)

    if game.is_manual:
        if str(game.created_by) != str(current_user.id):
            raise HTTPException(status_code=403, detail="Você não pode remover este jogo.")
        db.delete(game)
    else:
        db.delete(db_user_game)

    db.commit()
