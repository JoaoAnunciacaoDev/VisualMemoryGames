from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class GameInList(BaseModel):
    id: str
    title: str
    cover_url: Optional[str] = None
    external_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class CustomListCreate(BaseModel):
    name: str


class CustomListResponse(BaseModel):
    id: str
    user_id: str
    name: str
    is_system: bool = False
    games: List[GameInList] = []

    model_config = ConfigDict(from_attributes=True)