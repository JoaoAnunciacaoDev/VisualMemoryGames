from pydantic import BaseModel, EmailStr, Field, field_validator

from app.schemas.user import UserRegisterInitiate


class PasswordResetInitiate(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)
    new_password: str = Field(min_length=8)

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, value):
        # Reutiliza o validador de complexidade de senha do cadastro
        return UserRegisterInitiate.validate_password(value)
