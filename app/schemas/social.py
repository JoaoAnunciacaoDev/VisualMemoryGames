from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel

from app.schemas.game import GameResponse


class UserPublicProfile(BaseModel):
    id: str
    username: str
    is_public: bool
    followers_count: int
    following_count: int
    is_following: Optional[bool] = None  # Para o usuário logado saber se segue


class ActivityResponse(BaseModel):
    id: int
    user_id: str
    username: str
    game: GameResponse
    action_type: str
    context: Optional[str] = None
    created_at: datetime


class RawgRelease(BaseModel):
    title: str
    cover_url: Optional[str]
    release_date: Optional[str]
    genres: List[str]


class FeedResponse(BaseModel):
    activities: List[ActivityResponse]
    rawg_releases: List[RawgRelease]
