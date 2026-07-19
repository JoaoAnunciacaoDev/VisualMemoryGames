from __future__ import annotations

import uuid
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import JSON, Boolean, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from sqlalchemy.ext.associationproxy import association_proxy, AssociationProxy

if TYPE_CHECKING:
    from app.models.custom_lists import CustomList, CustomListGame
    from app.models.tierlist import TierItem
    from app.models.user_game import UserGame


class Game(Base):
    __tablename__ = "games"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    external_id: Mapped[Optional[int]] = mapped_column(
        Integer, unique=True, index=True, nullable=True
    )
    steam_appid: Mapped[Optional[int]] = mapped_column(
        Integer, unique=True, index=True, nullable=True
    )
    title: Mapped[str] = mapped_column(String, nullable=False)
    cover_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    release_year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    platforms: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    genres: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    is_manual: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_by: Mapped[Optional[str]] = mapped_column(
        String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    user_games: Mapped[List["UserGame"]] = relationship(
        "UserGame", back_populates="game", cascade="all, delete-orphan"
    )
    tier_items: Mapped[List["TierItem"]] = relationship(
        "TierItem", back_populates="game", cascade="all, delete-orphan"
    )
    list_games: Mapped[List["CustomListGame"]] = relationship(
        "CustomListGame", back_populates="game", cascade="all, delete-orphan"
    )
    custom_lists: AssociationProxy[List["CustomList"]] = association_proxy(
        "list_games", "custom_list"
    )
