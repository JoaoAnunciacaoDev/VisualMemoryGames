from typing import Optional 
from pydantic import BaseModel, EmailStr, ConfigDict


class UserBase(BaseModel):
    username: str
    email: EmailStr


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None


class UserResponse(UserBase):
    id: str
    model_config = ConfigDict(from_attributes=True)