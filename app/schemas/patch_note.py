from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class PatchNoteBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    content: str = Field(..., min_length=10)


class PatchNoteCreate(PatchNoteBase):
    pass


class PatchNoteUpdate(PatchNoteBase):
    pass


class PatchNoteAuthorResponse(BaseModel):
    id: str
    username: str

    model_config = ConfigDict(from_attributes=True)


class PatchNoteResponse(PatchNoteBase):
    id: str
    author_id: str
    created_at: datetime
    updated_at: datetime
    author: Optional[PatchNoteAuthorResponse] = None

    model_config = ConfigDict(from_attributes=True)
