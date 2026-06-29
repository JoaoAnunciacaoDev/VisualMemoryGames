import uuid

from sqlalchemy import Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.database import Base


class TierList(Base):
    __tablename__ = "tierlists"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)

    user = relationship("User", back_populates="tier_lists")
    categories = relationship(
        "TierCategory",
        back_populates="tierlist",
        cascade="all, delete-orphan",
        order_by="TierCategory.order_index",
    )


class TierCategory(Base):
    __tablename__ = "tier_categories"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tierlist_id = Column(String, ForeignKey("tierlists.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    order_index = Column(Integer, nullable=False)
    color = Column(String, nullable=False, default="#cccccc")

    tierlist = relationship("TierList", back_populates="categories")
    items = relationship(
        "TierItem",
        back_populates="category",
        cascade="all, delete-orphan",
        order_by="TierItem.order_index",
    )


class TierItem(Base):
    __tablename__ = "tier_items"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    category_id = Column(
        String, ForeignKey("tier_categories.id", ondelete="CASCADE"), nullable=False
    )
    game_id = Column(String, ForeignKey("games.id", ondelete="CASCADE"), nullable=False)
    order_index = Column(Integer, nullable=False, default=0)

    category = relationship("TierCategory", back_populates="items")
    game = relationship("Game", back_populates="tier_items")
