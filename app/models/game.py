import uuid
from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.database import Base


class Game(Base):
    __tablename__ = "games"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    external_id = Column(Integer, unique=True, index=True, nullable=False)
    title = Column(String, nullable=False)
    cover_url = Column(String, nullable=True)

    user_games = relationship("UserGame", back_populates="game", cascade="all, delete-orphan")
    tier_items = relationship("TierItem", back_populates="game", cascade="all, delete-orphan")