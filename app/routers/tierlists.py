from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.models.tierlist import TierList, TierCategory, TierItem
from app.models.user import User
from app.models.game import Game

from app.security import get_current_user
from app.schemas.tierlist import (
    TierListCreate, TierListResponse, 
    TierItemCreate, TierItemResponse
)
from app.database import get_db


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

    default_categories = ["S", "A", "B", "C", "D"]
    for index, name in enumerate(default_categories):
        category = TierCategory(
            tierlist_id=new_tierlist.id, 
            name=name, 
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
    """Adiciona um jogo a uma categoria específica da Tier List."""
    
    category = db.query(TierCategory).filter(TierCategory.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Categoria não encontrada.")

    game = db.query(Game).filter(Game.id == item.game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Jogo não encontrado no catálogo.")

    new_item = TierItem(category_id=category_id, game_id=item.game_id)
    db.add(new_item)
    db.commit()
    db.refresh(new_item)

    return new_item


@router.get("/user/{user_id}", response_model=List[TierListResponse])
def get_user_tierlists(user_id: str, db: Session = Depends(get_db)):
    """Busca todas as Tier Lists de um usuário, trazendo a árvore completa de dados."""
    
    tierlists = db.query(TierList).filter(TierList.user_id == user_id).all()
    return tierlists