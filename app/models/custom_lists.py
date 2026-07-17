from __future__ import annotations

import uuid
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, Column, ForeignKey, String, Table
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.game import Game
    from app.models.user import User

custom_list_games = Table(
    "custom_list_games",
    Base.metadata,
    Column(
        "custom_list_id",
        String,
        ForeignKey("custom_lists.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column("game_id", String, ForeignKey("games.id", ondelete="CASCADE"), primary_key=True),
)


class CustomList(Base):
    __tablename__ = "custom_lists"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    is_system: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    list_type: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="custom_lists")
    games: Mapped[List["Game"]] = relationship(
        "Game", secondary=custom_list_games, back_populates="custom_lists"
    )
