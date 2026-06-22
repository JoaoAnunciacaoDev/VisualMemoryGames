from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class TierItemBase(BaseModel):
    game_id: str


class TierItemCreate(TierItemBase):
    pass


class TierItemResponse(TierItemBase):
    id: str
    category_id: str

    model_config = ConfigDict(from_attributes=True)


class TierCategoryBase(BaseModel):
    name: str
    order_index: int


class TierCategoryCreate(TierCategoryBase):
    pass


class TierCategoryUpdate(BaseModel):
    name: Optional[str] = None
    order_index: Optional[int] = None


class TierCategoryResponse(TierCategoryBase):
    id: str
    tierlist_id: str
    
    items: List[TierItemResponse] = []
    model_config = ConfigDict(from_attributes=True)


class TierListBase(BaseModel):
    title: str


class TierListCreate(TierListBase):
    pass


class TierListUpdate(BaseModel):
    title: Optional[str] = None


class TierListResponse(TierListBase):
    id: str
    user_id: str
    
    categories: List[TierCategoryResponse] = [] 
    model_config = ConfigDict(from_attributes=True)