import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String
from sqlalchemy.orm import relationship

from app.database import Base


class ItchAccount(Base):
    __tablename__ = "itch_accounts"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    itch_id = Column(String, nullable=False, index=True)
    username = Column(String, nullable=False)
    avatar_url = Column(String, nullable=True)
    last_sync_at = Column(DateTime, nullable=True)
    access_token = Column(String, nullable=False)  # Guarda o token de acesso à API

    user = relationship("User", back_populates="itch_accounts")
