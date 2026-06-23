import json
from typing import Optional
from pydantic import BaseModel, ConfigDict, field_validator


class GameBase(BaseModel):
    external_id: int
    title: str
    cover_url: Optional[str] = None
    release_year: int | None
    platforms: list[str]
    genres: list[str]


class GameCreate(GameBase):
    pass


class GameResponse(GameBase):
    id: str
    
    model_config = ConfigDict(from_attributes=True)
    @field_validator('platforms', 'genres', mode='before')
    @classmethod
    def parse_json_list(cls, v):
        if isinstance(v, str):
            return json.loads(v)
        return v or []  


class UserGameBase(BaseModel):
    rating: Optional[int] = None
    status: str = "Quero Jogar"
    played_year: Optional[int] = None
    notes: Optional[str] = None


class UserGameCreate(UserGameBase):
    game_id: str


class UserGameUpdate(BaseModel):
    rating: Optional[int] = None
    status: Optional[str] = None
    played_year: Optional[int] = None
    notes: Optional[str] = None


class UserGameResponse(UserGameBase):
    id: str
    user_id: str
    game_id: str
    external_id: int
    
    model_config = ConfigDict(from_attributes=True)