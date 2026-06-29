import uuid

from sqlalchemy import Boolean, Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.database import Base


class Game(Base):
    __tablename__ = "games"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    external_id = Column(Integer, unique=True, index=True, nullable=True)
    title = Column(String, nullable=False)
    cover_url = Column(String, nullable=True)
    release_year = Column(Integer, nullable=True)
    platforms = Column(String, nullable=True)
    genres = Column(String, nullable=True)
    is_manual = Column(Boolean, default=False, nullable=False)
    created_by = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    user_games = relationship("UserGame", back_populates="game", cascade="all, delete-orphan")
    tier_items = relationship("TierItem", back_populates="game", cascade="all, delete-orphan")
    custom_lists = relationship("CustomList", secondary="custom_list_games", back_populates="games")
