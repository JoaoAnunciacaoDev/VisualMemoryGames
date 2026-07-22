from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class UserGameReviewBase(BaseModel):
    rating: Optional[float] = Field(default=None, ge=0, le=10)
    notes: Optional[str] = None

    @field_validator("notes")
    @classmethod
    def validate_notes_length(cls, v: Optional[str]) -> Optional[str]:
        if v and len(v) > 5000:
            raise ValueError("O comentário/avaliação não pode ter mais de 5000 caracteres.")
        return v


class UserGameReviewCreate(UserGameReviewBase):
    pass


class UserGameReviewUpdate(UserGameReviewBase):
    pass


class UserGameReviewResponse(UserGameReviewBase):
    id: str
    user_game_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
