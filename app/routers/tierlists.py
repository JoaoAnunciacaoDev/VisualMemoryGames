from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.dependencies import get_category_and_tierlist_or_raise, get_owned_or_raise
from app.models.game import Game
from app.models.tierlist import TierCategory, TierItem, TierList
from app.models.user import User
from app.schemas.tierlist import (
    MoveItemRequest,
    ReorderCategoriesRequest,
    ReorderItemsRequest,
    TierCategoryCreate,
    TierCategoryResponse,
    TierCategoryUpdate,
    TierItemCreate,
    TierItemResponse,
    TierListCreate,
    TierListResponse,
    TierListUpdate,
)
from app.security import get_current_user
from app.services.tierlist_service import (
    create_default_categories,
    enrich_tierlist_with_custom_covers,
)

router = APIRouter(prefix="/tierlists", tags=["Tier Lists"])


@router.post("/", response_model=TierListResponse, status_code=status.HTTP_201_CREATED)
def create_tierlist(
    tierlist: TierListCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    new_tierlist = TierList(
        user_id=current_user.id,
        title=tierlist.title,
        is_public=tierlist.is_public,
    )
    db.add(new_tierlist)
    db.commit()
    db.refresh(new_tierlist)

    create_default_categories(str(new_tierlist.id), db)

    # Registo de atividade para criação de Tier List (apenas se for pública)
    if new_tierlist.is_public:
        from app.models.activity import Activity
        activity = Activity(
            user_id=str(current_user.id),
            game_id=None,
            action_type="CREATED_TIERLIST",
            tierlist_id=str(new_tierlist.id)
        )
        db.add(activity)
        db.commit()

    db.refresh(new_tierlist)
    return new_tierlist


@router.get("/me", response_model=List[TierListResponse])
def get_my_tierlists(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Busca todas as Tier Lists do usuário logado."""
    return get_user_tierlists(str(current_user.id), db, current_user)


@router.get("/user/{user_id}", response_model=List[TierListResponse])
def get_user_tierlists(
    user_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """Busca as Tier Lists de um usuário.

    O próprio dono vê todas; outros usuários vêem apenas as públicas.
    """
    query = db.query(TierList).options(
        joinedload(TierList.categories).joinedload(TierCategory.items).joinedload(TierItem.game)
    )
    if str(user_id) != str(current_user.id):
        query = query.filter(TierList.user_id == user_id, TierList.is_public)
    else:
        query = query.filter(TierList.user_id == user_id)

    tierlists = query.all()
    for tl in tierlists:
        enrich_tierlist_with_custom_covers(tl, db)
    return tierlists


@router.get("/{tierlist_id}", response_model=TierListResponse)
def get_tierlist(
    tierlist_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    tierlist = (
        db.query(TierList)
        .options(
            joinedload(TierList.categories).joinedload(TierCategory.items).joinedload(TierItem.game)
        )
        .filter(TierList.id == tierlist_id)
        .first()
    )

    if not tierlist:
        raise HTTPException(status_code=404, detail="Tier List não encontrada.")

    if not tierlist.is_public and str(tierlist.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Sem permissão para ver esta tier list.")

    enrich_tierlist_with_custom_covers(tierlist, db)

    return tierlist


@router.put("/{tierlist_id}", response_model=TierListResponse)
def update_tierlist(
    tierlist_id: str,
    data: TierListUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tierlist: TierList = get_owned_or_raise(TierList, tierlist_id, str(current_user.id), db)
    old_title = tierlist.title
    old_is_public = getattr(tierlist, "is_public", True)

    if data.title is not None:
        tierlist.title = data.title
    if data.is_public is not None:
        tierlist.is_public = data.is_public

    db.commit()
    db.refresh(tierlist)

    from app.models.activity import Activity
    if not tierlist.is_public:
        # Se a tier list passou a ser privada, deleta todas as atividades relacionadas a ela
        db.query(Activity).filter(
            Activity.tierlist_id == tierlist.id
        ).delete(synchronize_session=False)
        db.commit()
    else:
        # Se a tier list é/continua pública e foi atualizada relevante (título ou se tornou pública)
        has_new_title = data.title is not None and old_title != data.title
        has_visibility_changed = data.is_public is not None and not old_is_public
        if has_new_title or has_visibility_changed:
            activity = Activity(
                user_id=str(current_user.id),
                game_id=None,
                action_type="UPDATED_TIERLIST",
                tierlist_id=str(tierlist.id),
            )
            db.add(activity)
            db.commit()

    return tierlist


@router.delete("/{tierlist_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tierlist(
    tierlist_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    db_tierlist: TierList = get_owned_or_raise(TierList, tierlist_id, str(current_user.id), db)
    db.delete(db_tierlist)
    db.commit()
    return None


@router.post(
    "/{tierlist_id}/categories",
    response_model=TierCategoryResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_category(
    tierlist_id: str,
    category: TierCategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tierlist: TierList = get_owned_or_raise(TierList, tierlist_id, str(current_user.id), db)

    new_category = TierCategory(
        tierlist_id=tierlist.id,
        name=category.name,
        color=category.color,
        order_index=category.order_index,
    )
    db.add(new_category)
    db.commit()
    db.refresh(new_category)
    return new_category


@router.put("/category/{category_id}", response_model=TierCategoryResponse)
def update_category(
    category_id: str,
    data: TierCategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    category, _ = get_category_and_tierlist_or_raise(category_id, str(current_user.id), db)

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(category, key, value)

    db.commit()
    db.refresh(category)
    return category


@router.delete("/category/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    category, _ = get_category_and_tierlist_or_raise(category_id, str(current_user.id), db)

    db.delete(category)
    db.commit()
    return None


@router.put("/{tierlist_id}/categories/reorder")
def reorder_categories(
    tierlist_id: str,
    data: ReorderCategoriesRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_owned_or_raise(TierList, tierlist_id, str(current_user.id), db)

    categories = (
        db.query(TierCategory)
        .filter(TierCategory.id.in_(data.category_ids), TierCategory.tierlist_id == tierlist_id)
        .all()
    )

    cat_dict = {str(c.id): c for c in categories}
    for index, category_id in enumerate(data.category_ids):
        if category_id in cat_dict:
            cat_dict[category_id].order_index = index
    db.commit()
    return {"ok": True}


@router.post(
    "/category/{category_id}/items",
    response_model=TierItemResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_item_to_category(
    category_id: str,
    item: TierItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    category, _ = get_category_and_tierlist_or_raise(category_id, str(current_user.id), db)

    game = db.query(Game).filter(Game.id == item.game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Jogo não encontrado no catálogo.")

    existing = (
        db.query(TierItem)
        .join(TierCategory, TierCategory.id == TierItem.category_id)
        .filter(TierCategory.tierlist_id == category.tierlist_id, TierItem.game_id == item.game_id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Este jogo já está na tier list.")

    max_order = (
        db.query(func.max(TierItem.order_index))
        .filter(TierItem.category_id == category_id)
        .scalar()
        or -1
    )

    new_item = TierItem(category_id=category_id, game_id=item.game_id, order_index=max_order + 1)

    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item


@router.put("/category/{category_id}/items/{item_id}/move")
def move_item(
    category_id: str,
    item_id: str,
    data: MoveItemRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(TierItem).filter(TierItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado.")

    get_category_and_tierlist_or_raise(str(item.category_id), str(current_user.id), db)

    item.category_id = data.target_category_id
    db.commit()
    return {"ok": True}


@router.delete("/category/{category_id}/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_item_from_category(
    category_id: str,
    item_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    category, _ = get_category_and_tierlist_or_raise(category_id, str(current_user.id), db)

    item = (
        db.query(TierItem)
        .filter(TierItem.id == item_id, TierItem.category_id == category_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado.")

    db.delete(item)
    db.commit()
    return None


@router.put("/category/{category_id}/reorder")
def reorder_items(
    category_id: str,
    data: ReorderItemsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_category_and_tierlist_or_raise(category_id, str(current_user.id), db)

    items = db.query(TierItem).filter(TierItem.id.in_(data.item_ids)).all()
    item_dict = {str(i.id): i for i in items}

    for index, item_id in enumerate(data.item_ids):
        if item_id in item_dict:
            item_dict[item_id].order_index = index
    db.commit()
    return {"ok": True}
