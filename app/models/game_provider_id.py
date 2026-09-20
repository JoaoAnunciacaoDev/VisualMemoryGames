from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class GameProviderId(Base):
    __tablename__ = "game_provider_ids"
    __table_args__ = (
        UniqueConstraint(
            "provider", "external_id", name="uq_game_provider_ids_provider_external_id"
        ),
        Index("ix_game_provider_ids_game_id", "game_id"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    game_id: Mapped[str] = mapped_column(
        String, ForeignKey("games.id", ondelete="CASCADE"), nullable=False
    )
    provider: Mapped[str] = mapped_column(String(32), nullable=False)
    external_id: Mapped[str] = mapped_column(String(255), nullable=False)

    game = relationship("Game")
