from typing import Any, Type

from fastapi import HTTPException
from sqlalchemy.orm import Session


def get_owned_or_raise(model: Type[Any], record_id: str, user_id: str, db: Session) -> Any:
    """
    Busca um registo pelo ID e valida que o utilizador autenticado é o seu dono.
    Lança 404 se não encontrado ou 403 se não for o dono.
    """
    record = db.query(model).filter(model.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Recurso não encontrado.")
    if str(record.user_id) != str(user_id):
        raise HTTPException(status_code=403, detail="Sem permissão.")
    return record


def get_category_and_tierlist_or_raise(
    category_id: str, user_id: str, db: Session
) -> tuple[Any, Any]:
    """
    Busca uma categoria e a sua Tier List, validando que o utilizador é o dono da lista.
    Retorna (category, tierlist).
    """
    from app.models.tierlist import TierCategory, TierList

    category = db.query(TierCategory).filter(TierCategory.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Categoria não encontrada.")

    tierlist = db.query(TierList).filter(TierList.id == category.tierlist_id).first()
    if not tierlist or str(tierlist.user_id) != str(user_id):
        raise HTTPException(status_code=403, detail="Sem permissão.")

    return category, tierlist
