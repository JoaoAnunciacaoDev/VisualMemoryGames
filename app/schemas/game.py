import json
from typing import Optional
from datetime import date
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from app.enums.game_status import GameStatus
from app.enums.game_stores import Store


class GameBase(BaseModel):
    external_id: Optional[int] = None
    title: str
    cover_url: Optional[str] = None
    release_year: int | None
    platforms: list[str]
    genres: list[str]


class GameCreate(GameBase):
    pass


class GameManualCreate(BaseModel):
    title: str
    cover_url: Optional[str] = None
    release_year: Optional[int] = None
    platforms: list[str] = []
    genres: list[str] = []


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
    rating: Optional[float] = Field(default=None, ge=0, le=10)
    status: GameStatus = GameStatus.WANT_TO_PLAY

    started_at: Optional[date] = None
    finished_at: Optional[date] = None
    acquired_at: Optional[date] = None
    platinum_at: Optional[date] = None

    hours_played: Optional[float] = Field(default=None, ge=0)

    store: Optional[Store] = None

    custom_cover_url: Optional[str] = None

    favorite: bool = False

    notes: Optional[str] = None
    
    @model_validator(mode="after")
    def validate_dates(self):
        if (
            self.platinum_at is not None
            and self.finished_at is not None
            and self.platinum_at < self.finished_at
        ):
            raise ValueError(
                "A data de platina não pode ser anterior à data de conclusão."
            )

        return self


class UserGameCreate(UserGameBase):
    game_id: str


class UserGameUpdate(BaseModel):
    rating: Optional[float] = Field(default=None, ge=0, le=10)

    status: Optional[GameStatus] = None

    started_at: Optional[date] = None
    finished_at: Optional[date] = None
    acquired_at: Optional[date] = None
    platinum_at: Optional[date] = None

    hours_played: Optional[float] = Field(default=None, ge=0)

    store: Optional[Store] = None

    custom_cover_url: Optional[str] = None

    favorite: Optional[bool] = None

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

    external_id: Optional[int] = None
    title: str

    cover_url: Optional[str] = None
    custom_cover_url: Optional[str] = None

    release_year: Optional[int] = None

    rating: Optional[float] = Field(default=None, ge=0, le=10)

    status: GameStatus

    started_at: Optional[date] = None
    finished_at: Optional[date] = None
    acquired_at: Optional[date] = None
    platinum_at: Optional[date] = None

    hours_played: Optional[float] = None

    store: Optional[Store] = None

    favorite: bool = False

    notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)