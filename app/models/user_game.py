from __future__ import annotations

import uuid
from datetime import date
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, Date, Float, ForeignKey, Index, String, Text, desc
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.game import Game
    from app.models.user import User
    from app.models.user_game_review import UserGameReview


class UserGame(Base):
    __tablename__ = "user_games"
    __table_args__ = (Index("ix_user_games_user_game", "user_id", "game_id", unique=True),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    game_id: Mapped[str] = mapped_column(
        String, ForeignKey("games.id", ondelete="CASCADE"), nullable=False, index=True
    )

    rating: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String, nullable=False, default="Quero Jogar")
    started_at: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    finished_at: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    acquired_at: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    platinum_at: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    hours_played: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    store: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    custom_cover_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    favorite: Mapped[bool] = mapped_column(Boolean, default=False)

    user: Mapped["User"] = relationship("User", back_populates="user_games")
    game: Mapped["Game"] = relationship("Game", back_populates="user_games")
    reviews: Mapped[list["UserGameReview"]] = relationship(
        "UserGameReview",
        back_populates="user_game",
        cascade="all, delete-orphan",
        order_by=desc("UserGameReview.created_at")
    )
