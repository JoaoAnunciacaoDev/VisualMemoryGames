import json
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator, HttpUrl
from datetime import datetime
from app.enums.game_status import GameStatus
from datetime import date


class GameBase(BaseModel):
    external_id: int
    title: str
    cover_url: Optional[HttpUrl] = None
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
    rating: Optional[int] = Field(default=None, ge=0, le=10)
    status: GameStatus = GameStatus.WANT_TO_PLAY
    started_at: Optional[date] = None
    finished_at: Optional[date] = None
    notes: Optional[str] = None


class UserGameCreate(UserGameBase):
    game_id: str


class UserGameUpdate(BaseModel):
    rating: Optional[int] = Field(default=None, ge=0, le=10)
    status: Optional[GameStatus] = None
    started_at: Optional[date] = None
    finished_at: Optional[date] = None
    notes: Optional[str] = None


class UserGameResponse(UserGameBase):
    id: str
    user_id: str
    game_id: str
    
    model_config = ConfigDict(from_attributes=True)


class LibraryGameResponse(BaseModel):
    id: str
    user_id: str
    game_id: str
    external_id: int
    title: str
    cover_url: Optional[HttpUrl] = None
    release_year: Optional[int] = None
    rating: Optional[int] = None
    status: GameStatus
    started_at: Optional[date] = None
    finished_at: Optional[date] = None
    notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)