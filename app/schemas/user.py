import re
from datetime import datetime
from typing import Dict, List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator


class UserBase(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    is_public: Optional[bool] = False

    @field_validator("username")
    @classmethod
    def validate_username(cls, value):
        value = value.strip()
        if not value:
            raise ValueError("Nome de Usuário não pode estar vazio")
        if not re.match(r"^[a-zA-Z0-9_-]+$", value):
            raise ValueError("Nome de Usuário só pode conter letras, números, underscores e hífens")
        return value


class UserRegisterInitiate(UserBase):
    password: str = Field(min_length=8)

    @field_validator("password")
    @classmethod
    def validate_password(cls, value):
        if " " in value:
            raise ValueError("A senha não pode conter espaços")
        if not re.search(r"[A-Z]", value):
            raise ValueError("A senha deve conter pelo menos uma letra maiúscula")

        if not re.search(r"[a-z]", value):
            raise ValueError("A senha deve conter pelo menos uma letra minúscula")

        if not re.search(r"\d", value):
            raise ValueError("A senha deve conter pelo menos um número")

        if not re.search(r"[@$!%*?&#_\-]", value):
            raise ValueError(
                "A senha deve conter pelo menos um caractere especial "
                "(@, $, !, %, *, ?, &, #, _, -)"
            )

        return value


class UserCreate(UserRegisterInitiate):
    code: str = Field(min_length=6, max_length=6)


class UserUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=30)
    email: Optional[EmailStr] = None

    @model_validator(mode="after")
    def check_at_least_one_field(self):
        if self.username is None and self.email is None:
            raise ValueError("Pelo menos um campo (username ou email) deve ser fornecido")
        return self


class UserResponse(UserBase):
    id: str
    is_admin: bool = False
    is_public: bool = False
    is_deleted: bool = False
    created_at: Optional[datetime] = None
    last_active_at: Optional[datetime] = None
    games_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class UserVisibilityUpdate(BaseModel):
    is_public: bool


class UserPasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, value):
        if " " in value:
            raise ValueError("A senha não pode conter espaços")
        if not re.search(r"[A-Z]", value):
            raise ValueError("A senha deve conter pelo menos uma letra maiúscula")
        if not re.search(r"[a-z]", value):
            raise ValueError("A senha deve conter pelo menos uma letra minúscula")
        if not re.search(r"\d", value):
            raise ValueError("A senha deve conter pelo menos um número")
        if not re.search(r"[@$!%*?&#_\-]", value):
            raise ValueError(
                "A senha deve conter pelo menos um caractere especial "
                "(@, $, !, %, *, ?, &, #, _, -)"
            )
        return value


class UserDeleteRequest(BaseModel):
    password: str


class DashboardGame(BaseModel):
    title: str
    cover_url: Optional[str] = None
    hours_played: float
    rating: Optional[float] = None
    finished_at: Optional[datetime] = None


class YearlyGames(BaseModel):
    year: int
    games: List[DashboardGame]


class DashboardResponse(BaseModel):
    username: str
    email: str
    created_at: Optional[datetime] = None
    games_count: int
    lists_count: int
    tierlists_count: int
    favorites_count: int = 0
    status_distribution: Dict[str, int]
    most_played_genre: Optional[str] = None
    genre_distribution: Dict[str, int] = Field(default_factory=dict)
    has_pending_genres: bool = False
    followers_count: int = 0
    following_count: int = 0
    yearly_games: List[YearlyGames]
    yearly_platinums: List[YearlyGames] = Field(default_factory=list)
