import uuid
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class TierList(Base):
    __tablename__ = "tierlists"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)

    user = relationship("User", back_populates="tier_lists")
    categories = relationship("TierCategory", back_populates="tierlist", cascade="all, delete-orphan")


class TierCategory(Base):
    __tablename__ = "tier_categories"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tierlist_id = Column(Integer, ForeignKey("tierlists.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    order_index = Column(Integer, nullable=False)

    tierlist = relationship("TierList", back_populates="categories")
    items = relationship("TierItem", back_populates="category", cascade="all, delete-orphan")


class TierItem(Base):
    __tablename__ = "tier_items"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    category_id = Column(Integer, ForeignKey("tier_categories.id", ondelete="CASCADE"), nullable=False)
    game_id = Column(Integer, ForeignKey("games.id", ondelete="CASCADE"), nullable=False)

    category = relationship("TierCategory", back_populates="items")
    game = relationship("Game")