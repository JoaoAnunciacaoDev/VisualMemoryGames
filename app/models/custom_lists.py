from __future__ import annotations

import uuid
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Table
from sqlalchemy.ext.associationproxy import AssociationProxy, association_proxy
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
    Column("order_index", Integer, nullable=False, default=0, server_default="0"),
)


class CustomListGame(Base):
    __table__ = custom_list_games

    # Relationships
    custom_list: Mapped["CustomList"] = relationship("CustomList", back_populates="list_games")
    game: Mapped["Game"] = relationship("Game")


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

    list_games: Mapped[List["CustomListGame"]] = relationship(
        "CustomListGame", back_populates="custom_list", cascade="all, delete-orphan"
    )

    games: AssociationProxy[List["Game"]] = association_proxy(
        "list_games", "game", creator=lambda game: CustomListGame(game=game)
    )
