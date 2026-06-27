import uuid
from sqlalchemy import Column, String, ForeignKey, Table, Boolean
from sqlalchemy.orm import relationship
from app.database import Base

custom_list_games = Table(
    "custom_list_games",
    Base.metadata,
    Column("custom_list_id", String, ForeignKey("custom_lists.id", ondelete="CASCADE"), primary_key=True),
    Column("game_id", String, ForeignKey("games.id", ondelete="CASCADE"), primary_key=True),
)

class CustomList(Base):
    __tablename__ = "custom_lists"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    is_system = Column(Boolean, default=False, nullable=False)

    user = relationship("User", back_populates="custom_lists")
    games = relationship("Game", secondary=custom_list_games, back_populates="custom_lists")