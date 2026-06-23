import re
from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict, Field, field_validator


class UserBase(BaseModel):
    username: str = Field(min_length=3, max_length=30)
    email: EmailStr

    @field_validator("username")
    @classmethod
    def validate_username(cls, value):
        value = value.strip()

        if not value:
            raise ValueError("Username não pode estar vazio")

        return value


class UserCreate(UserBase):
    password: str = Field(min_length=8)

    @field_validator("password")
    @classmethod
    def validate_password(cls, value):
        if not re.search(r'[A-Z]', value):
            raise ValueError("A senha deve conter pelo menos uma letra maiúscula")
            
        if not re.search(r'[a-z]', value):
            raise ValueError("A senha deve conter pelo menos uma letra minúscula")
            
        if not re.search(r'\d', value):
            raise ValueError("A senha deve conter pelo menos um número")
            
        if not re.search(r'[@$!%*?&#_\-]', value):
            raise ValueError("A senha deve conter pelo menos um caractere especial (@, $, !, %, *, ?, &, #, _, -)")
            
        return value


class UserUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=30)
    email: Optional[EmailStr] = None

    @field_validator("username")
    @classmethod
    def validate_username(cls, value):
        if value is not None:
            value = value.strip()
            if not value:
                raise ValueError("Username não pode estar vazio")
        return value


class UserResponse(UserBase):
    id: str

    model_config = ConfigDict(from_attributes=True)