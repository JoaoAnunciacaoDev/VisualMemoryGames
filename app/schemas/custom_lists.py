from typing import List, Optional

from pydantic import BaseModel, ConfigDict, field_validator


class GameInList(BaseModel):
    id: str
    title: str
    cover_url: Optional[str] = None
    custom_cover_url: Optional[str] = None
    external_id: Optional[int] = None
    order_index: int = 0

    model_config = ConfigDict(from_attributes=True)


class CustomListCreate(BaseModel):
    name: str

    @field_validator("name")
    @classmethod
    def validate_name(cls, v):
        if not v.strip():
            raise ValueError("O nome da lista não pode estar vazio")
        return v.strip()


class CustomListResponse(BaseModel):
    id: str
    user_id: str
    name: str
    is_system: bool = False
    list_type: Optional[str] = None
    games: List[GameInList] = []

    model_config = ConfigDict(from_attributes=True)


class CustomListUpdate(BaseModel):
    name: str

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("O nome da lista não pode estar vazio")
        return v.strip()


class ReorderGamesRequest(BaseModel):
    game_ids: List[str]
