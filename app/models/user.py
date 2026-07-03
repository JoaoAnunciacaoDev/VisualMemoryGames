from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.custom_lists import CustomList
    from app.models.steam_account import SteamAccount
    from app.models.tierlist import TierList
    from app.models.user_game import UserGame


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=True
    )
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    user_games: Mapped[List["UserGame"]] = relationship(
        "UserGame", back_populates="user", cascade="all, delete-orphan"
    )
    tier_lists: Mapped[List["TierList"]] = relationship(
        "TierList", back_populates="user", cascade="all, delete-orphan"
    )
    custom_lists: Mapped[List["CustomList"]] = relationship(
        "CustomList", back_populates="user", cascade="all, delete-orphan"
    )
    steam_accounts: Mapped[List["SteamAccount"]] = relationship(
        "SteamAccount", back_populates="user", cascade="all, delete-orphan"
    )
