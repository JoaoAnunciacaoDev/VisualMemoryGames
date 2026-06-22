import uuid
from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class UserGame(Base):
    __tablename__ = "user_games"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    game_id = Column(String, ForeignKey("games.id", ondelete="CASCADE"), nullable=False)

    rating = Column(Integer, nullable=True)
    status = Column(String, nullable=False, default="Quero Jogar") 
    played_year = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)

    user = relationship("User", back_populates="user_games")
    game = relationship("Game", back_populates="user_games")