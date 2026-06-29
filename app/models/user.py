import uuid

from sqlalchemy import Column, String
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)

    user_games = relationship("UserGame", back_populates="user", cascade="all, delete-orphan")
    tier_lists = relationship("TierList", back_populates="user", cascade="all, delete-orphan")
    custom_lists = relationship("CustomList", back_populates="user", cascade="all, delete-orphan")
