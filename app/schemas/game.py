import json
from datetime import date
from typing import Optional

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

    @field_validator("title")
    @classmethod
    def validate_title(cls, v):
        if not v.strip():
            raise ValueError("O título do jogo não pode estar vazio")
        return v.strip()

    @field_validator("release_year")
    @classmethod
    def validate_release_year(cls, v):
        if v is not None:
            current_year = date.today().year
            if v > current_year + 2:
                raise ValueError(f"Ano de lançamento não pode ser superior a {current_year + 2}")
        return v

    @field_validator("platforms", "genres")
    @classmethod
    def validate_no_empty_strings(cls, v):
        return [item.strip() for item in v if item.strip()]


class GameCreate(GameBase):
    pass


class GameManualCreate(BaseModel):
    title: str
    cover_url: Optional[str] = None
    release_year: Optional[int] = None
    platforms: list[str] = []
    genres: list[str] = []

    @field_validator("title")
    @classmethod
    def validate_title(cls, v):
        if not v.strip():
            raise ValueError("O título do jogo não pode estar vazio")
        return v.strip()

    @field_validator("release_year")
    @classmethod
    def validate_release_year(cls, v):
        if v is not None:
            current_year = date.today().year
            if v > current_year + 2:
                raise ValueError(f"Ano de lançamento não pode ser superior a {current_year + 2}")
        return v


class GameResponse(GameBase):
    id: str

    model_config = ConfigDict(from_attributes=True)

    @field_validator("platforms", "genres", mode="before")
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
        if self.started_at and self.finished_at and self.started_at > self.finished_at:
            raise ValueError("A data de início não pode ser posterior à data de conclusão.")

        if self.platinum_at and self.acquired_at and self.platinum_at < self.acquired_at:
            raise ValueError("A data de platina não pode ser anterior à data de aquisição.")

        if self.platinum_at and self.started_at and self.platinum_at < self.started_at:
            raise ValueError("A data de platina não pode ser anterior à data de início.")

        if self.finished_at and self.started_at and self.finished_at < self.started_at:
            raise ValueError("A data de conclusão não pode ser anterior à data de início.")

        return self

    @field_validator("notes")
    @classmethod
    def validate_notes_length(cls, v):
        if v and len(v) > 2000:
            raise ValueError("As notas não podem exceder 2000 caracteres")
        return v


class UserGameCreate(UserGameBase):
    game_id: str

    @field_validator("game_id")
    @classmethod
    def validate_game_id(cls, v):
        if not v.strip():
            raise ValueError("O ID do jogo não pode estar vazio")
        return v


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

    @field_validator("notes")
    @classmethod
    def validate_notes_length(cls, v):
        if v is not None and len(v) > 2000:
            raise ValueError("As notas não podem exceder 2000 caracteres")
        return v


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

    is_manual: bool = False
    platforms: list[str] = []
    genres: list[str] = []

    model_config = ConfigDict(from_attributes=True)
