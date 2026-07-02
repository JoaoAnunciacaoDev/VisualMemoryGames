from __future__ import annotations

import uuid
from typing import TYPE_CHECKING, List

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.game import Game
    from app.models.user import User


class TierList(Base):
    __tablename__ = "tierlists"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="tier_lists")
    categories: Mapped[List["TierCategory"]] = relationship(
        "TierCategory",
        back_populates="tierlist",
        cascade="all, delete-orphan",
        order_by="TierCategory.order_index",
    )


class TierCategory(Base):
    __tablename__ = "tier_categories"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tierlist_id: Mapped[str] = mapped_column(
        String, ForeignKey("tierlists.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    color: Mapped[str] = mapped_column(String, nullable=False, default="#cccccc")

    tierlist: Mapped["TierList"] = relationship("TierList", back_populates="categories")
    items: Mapped[List["TierItem"]] = relationship(
        "TierItem",
        back_populates="category",
        cascade="all, delete-orphan",
        order_by="TierItem.order_index",
    )


class TierItem(Base):
    __tablename__ = "tier_items"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    category_id: Mapped[str] = mapped_column(
        String, ForeignKey("tier_categories.id", ondelete="CASCADE"), nullable=False
    )
    game_id: Mapped[str] = mapped_column(
        String, ForeignKey("games.id", ondelete="CASCADE"), nullable=False
    )
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    category: Mapped["TierCategory"] = relationship("TierCategory", back_populates="items")
    game: Mapped["Game"] = relationship("Game", back_populates="tier_items")
