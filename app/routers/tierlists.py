from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List

from app.models.tierlist import TierList, TierCategory, TierItem
from app.models.user import User
from app.models.user_game import UserGame
from app.models.game import Game

from app.security import get_current_user
from app.schemas.tierlist import (
    TierListCreate, TierListResponse, TierListUpdate,
    TierItemCreate, TierItemResponse,
    TierCategoryCreate, TierCategoryResponse, TierCategoryUpdate
)
from app.database import get_db
from pydantic import BaseModel


router = APIRouter(prefix="/tierlists", tags=["Tier Lists"])


@router.post("/", response_model=TierListResponse, status_code=status.HTTP_201_CREATED)
def create_tierlist(
    tierlist: TierListCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_tierlist = TierList(user_id=current_user.id, title=tierlist.title)
    db.add(new_tierlist)
    db.commit()
    db.refresh(new_tierlist)

    pool_category = TierCategory(
        tierlist_id=new_tierlist.id,
        name="__pool__",
        color="#cccccc",
        order_index=-1
    )
    db.add(pool_category)

    default_categories = [
        {"name": "S", "color": "#ff7f7f"},
        {"name": "A", "color": "#ffbf7f"},
        {"name": "B", "color": "#ffff7f"},
        {"name": "C", "color": "#7fff7f"},
        {"name": "D", "color": "#7fbfff"},
    ]

    for index, cat in enumerate(default_categories):
        category = TierCategory(
            tierlist_id=new_tierlist.id,
            name=cat["name"],
            color=cat["color"],
            order_index=index
        )
        db.add(category)

    db.commit()
    db.refresh(new_tierlist)
    return new_tierlist


@router.delete("/{tierlist_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tierlist(
    tierlist_id: str, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_tierlist = db.query(TierList).filter(TierList.id == tierlist_id).first()
    
    if not db_tierlist:
        raise HTTPException(status_code=404, detail="Tier List não encontrada.")

    if str(db_tierlist.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Você não tem permissão para deletar esta Tier List.")
        
    db.delete(db_tierlist)
    db.commit()
    
    return None


@router.post("/category/{category_id}/items", response_model=TierItemResponse, status_code=status.HTTP_201_CREATED)
def add_item_to_category(category_id: str, item: TierItemCreate, db: Session = Depends(get_db)):
    category = db.query(TierCategory).filter(TierCategory.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Categoria não encontrada.")

    game = db.query(Game).filter(Game.id == item.game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Jogo não encontrado no catálogo.")

    existing = (
        db.query(TierItem)
        .join(TierCategory, TierCategory.id == TierItem.category_id)
        .filter(
            TierCategory.tierlist_id == category.tierlist_id,
            TierItem.game_id == item.game_id
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Este jogo já está na tier list.")

    max_order = db.query(func.max(TierItem.order_index)).filter(
        TierItem.category_id == category_id
    ).scalar() or -1

    new_item = TierItem(
        category_id=category_id,
        game_id=item.game_id,
        order_index=max_order + 1
    )
    
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item


@router.get("/user/{user_id}", response_model=List[TierListResponse])
def get_user_tierlists(user_id: str, db: Session = Depends(get_db)):
    """Busca todas as Tier Lists de um usuário, trazendo a árvore completa de dados."""
    
    tierlists = db.query(TierList).filter(TierList.user_id == user_id).all()
    return tierlists


@router.get("/{tierlist_id}", response_model=TierListResponse)
def get_tierlist(
    tierlist_id: str, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tierlist = (
        db.query(TierList)
        .options(
            joinedload(TierList.categories)
            .joinedload(TierCategory.items)
            .joinedload(TierItem.game)
        )
        .filter(TierList.id == tierlist_id)
        .first()
    )
    
    if not tierlist:
        raise HTTPException(status_code=404, detail="Tier List não encontrada.")
    
    user_games = db.query(UserGame).filter(UserGame.user_id == tierlist.user_id).all()
    
    custom_covers = {
        ug.game_id: ug.custom_cover_url 
        for ug in user_games 
        if ug.custom_cover_url is not None and str(ug.custom_cover_url).strip() != ""
    }

    for category in tierlist.categories:
        for item in category.items:
            if item.game and item.game.id in custom_covers:
                setattr(item.game, "custom_cover_url", custom_covers[item.game.id])

    return tierlist


@router.put("/{tierlist_id}", response_model=TierListResponse)
def update_tierlist(
    tierlist_id: str,
    data: TierListUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tierlist = db.query(TierList).filter(TierList.id == tierlist_id).first()
    if not tierlist:
        raise HTTPException(status_code=404, detail="Tier List não encontrada.")
    if str(tierlist.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Sem permissão.")
    if data.title is not None:
        setattr(tierlist, 'title', data.title)
    db.commit()
    db.refresh(tierlist)
    return tierlist


@router.post("/{tierlist_id}/categories", response_model=TierCategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    tierlist_id: str,
    category: TierCategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tierlist = db.query(TierList).filter(TierList.id == tierlist_id).first()
    if not tierlist:
        raise HTTPException(status_code=404, detail="Tier List não encontrada.")
    if str(tierlist.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Sem permissão.")

    new_category = TierCategory(
        tierlist_id=tierlist_id,
        name=category.name,
        color=category.color,
        order_index=category.order_index
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
    current_user: User = Depends(get_current_user)
):
    category = db.query(TierCategory).filter(TierCategory.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Categoria não encontrada.")

    tierlist = db.query(TierList).filter(TierList.id == str(category.tierlist_id)).first()
    if not tierlist:
        raise HTTPException(status_code=404, detail="Tier List não encontrada.")
    if str(tierlist.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Sem permissão.")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(category, key, value)

    db.commit()
    db.refresh(category)
    return category


@router.delete("/category/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    category = db.query(TierCategory).filter(TierCategory.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Categoria não encontrada.")

    tierlist = db.query(TierList).filter(TierList.id == str(category.tierlist_id)).first()
    if not tierlist:
        raise HTTPException(status_code=404, detail="Tier List não encontrada.")
    if str(tierlist.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Sem permissão.")

    db.delete(category)
    db.commit()
    return None


@router.delete("/category/{category_id}/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_item_from_category(
    category_id: str,
    item_id: str,
    db: Session = Depends(get_db)
):
    item = db.query(TierItem).filter(
        TierItem.id == item_id,
        TierItem.category_id == category_id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado.")
    db.delete(item)
    db.commit()
    return None


class MoveItemRequest(BaseModel):
    target_category_id: str

@router.put("/category/{category_id}/items/{item_id}/move")
def move_item(
    category_id: str,
    item_id: str,
    data: MoveItemRequest,
    db: Session = Depends(get_db)
):
    item = db.query(TierItem).filter(TierItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado.")
    setattr(item, 'category_id', data.target_category_id)
    db.commit()
    return {"ok": True}


class ReorderItemsRequest(BaseModel):
    item_ids: list[str]

@router.put("/category/{category_id}/reorder")
def reorder_items(
    category_id: str,
    data: ReorderItemsRequest,
    db: Session = Depends(get_db)
):
    for index, item_id in enumerate(data.item_ids):
        item = db.query(TierItem).filter(TierItem.id == item_id).first()
        if item:
            setattr(item, 'order_index', index)
    db.commit()

    return {"ok": True}


class ReorderCategoriesRequest(BaseModel):
    category_ids: list[str]

@router.put("/{tierlist_id}/categories/reorder")
def reorder_categories(
    tierlist_id: str,
    data: ReorderCategoriesRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tierlist = db.query(TierList).filter(TierList.id == tierlist_id).first()
    if not tierlist:
        raise HTTPException(status_code=404, detail="Tier List não encontrada.")
    if str(tierlist.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Sem permissão.")

    for index, category_id in enumerate(data.category_ids):
        category = db.query(TierCategory).filter(
            TierCategory.id == category_id,
            TierCategory.tierlist_id == tierlist_id
        ).first()
        if category:
            setattr(category, 'order_index', index)
    db.commit()
    return {"ok": True}