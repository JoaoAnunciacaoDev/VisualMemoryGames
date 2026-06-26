import uuid
from sqlalchemy import Boolean, Column, Enum, Float, String, Text, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
from app.enums.game_stores import Store


class UserGame(Base):
    __tablename__ = "user_games"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    game_id = Column(String, ForeignKey("games.id", ondelete="CASCADE"), nullable=False)

    rating = Column(Float, nullable=True)
    status = Column(String, nullable=False, default="Quero Jogar")
    started_at = Column(Date, nullable=True)
    finished_at = Column(Date, nullable=True)
    acquired_at = Column(Date, nullable=True)
    platinum_at = Column(Date, nullable=True)
    hours_played = Column(Float, nullable=True)
    store = Column(Enum(Store), nullable=True)
    custom_cover_url = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    favorite = Column(Boolean, default=False)

    user = relationship("User", back_populates="user_games")
    game = relationship("Game", back_populates="user_games")