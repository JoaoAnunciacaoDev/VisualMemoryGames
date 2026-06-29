import re
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator


class UserBase(BaseModel):
    username: str = Field(min_length=3, max_length=30)
    email: EmailStr

    @field_validator("username")
    @classmethod
    def validate_username(cls, value):
        value = value.strip()
        if not value:
            raise ValueError("Nome de Usuário não pode estar vazio")
        if not re.match(r"^[a-zA-Z0-9_-]+$", value):
            raise ValueError("Nome de Usuário só pode conter letras, números, underscores e hífens")
        return value


class UserCreate(UserBase):
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

    model_config = ConfigDict(from_attributes=True)
