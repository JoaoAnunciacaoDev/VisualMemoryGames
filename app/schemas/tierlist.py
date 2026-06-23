from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field, field_validator


class TierItemBase(BaseModel):
    game_id: str


class TierItemCreate(TierItemBase):
    pass


class GameInTierItem(BaseModel):
    id: str
    title: str
    cover_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class TierItemResponse(TierItemBase):
    id: str
    category_id: str
    game: Optional[GameInTierItem] = None

    model_config = ConfigDict(from_attributes=True)


class TierCategoryBase(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    order_index: int = Field(ge=0)
    color: str = '#cccccc'

    @field_validator("name")
    @classmethod
    def validate_name(cls, value):
        value = value.strip()
        if not value:
            raise ValueError("O nome da categoria não pode estar vazio")
        return value


class TierCategoryCreate(TierCategoryBase):
    pass


class TierCategoryUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=50)
    order_index: Optional[int] = Field(default=None, ge=0)
    color: Optional[str] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value):
        if value is not None:
            value = value.strip()
            if not value:
                raise ValueError("O nome da categoria não pode estar vazio")
        return value


class TierCategoryResponse(TierCategoryBase):
    id: str
    tierlist_id: str
    
    items: List[TierItemResponse] = []
    model_config = ConfigDict(from_attributes=True)


class TierListBase(BaseModel):
    title: str = Field(min_length=1, max_length=100)

    @field_validator("title")
    @classmethod
    def validate_title(cls, value):
        value = value.strip()
        if not value:
            raise ValueError("O título da Tier List não pode estar vazio")
        return value


class TierListCreate(TierListBase):
    pass


class TierListUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=100)

    @field_validator("title")
    @classmethod
    def validate_title(cls, value):
        if value is not None:
            value = value.strip()
            if not value:
                raise ValueError("O título da Tier List não pode estar vazio")
        return value


class TierListResponse(TierListBase):
    id: str
    user_id: str
    
    categories: List[TierCategoryResponse] = [] 
    model_config = ConfigDict(from_attributes=True)


