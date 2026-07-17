from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class ItchAccount(Base):
    __tablename__ = "itch_accounts"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    itch_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    username: Mapped[str] = mapped_column(String, nullable=False)
    avatar_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    last_sync_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    access_token: Mapped[str] = mapped_column(String, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="itch_accounts")
