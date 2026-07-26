from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, backref, mapped_column, relationship

from app.database import Base


class Activity(Base):
    __tablename__ = "activities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    game_id: Mapped[str] = mapped_column(
        String, ForeignKey("games.id", ondelete="CASCADE"), nullable=True
    )
    target_user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )
    tierlist_id: Mapped[str] = mapped_column(
        String, ForeignKey("tierlists.id", ondelete="CASCADE"), nullable=True, index=True
    )

    # action_type could be 'ADDED', 'UPDATED_STATUS', 'RATED', 'PLATINUM', 'FOLLOW',
    # 'CREATED_TIERLIST', 'UPDATED_TIERLIST'
    action_type: Mapped[str] = mapped_column(String, nullable=False)

    # Optional context (e.g., 'Jogando', 'Finalizado' if action_type is 'UPDATED_STATUS')
    context: Mapped[str] = mapped_column(String, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), index=True
    )

    user = relationship(
        "User",
        foreign_keys=[user_id],
        backref=backref("activities", cascade="all, delete-orphan"),
    )
    target_user = relationship(
        "User", foreign_keys=[target_user_id], backref=backref("targeted_activities")
    )
    game = relationship("Game", backref=backref("activities", cascade="all, delete-orphan"))
    tierlist = relationship(
        "TierList", foreign_keys=[tierlist_id], backref=backref("tierlist_activities")
    )
