from sqlalchemy import Column, ForeignKey, Table

from .base import Base

buyer_category_preferences = Table(
    "buyer_category_preferences",
    Base.metadata,
    Column("buyer_id", ForeignKey("buyers.id", ondelete="CASCADE"), primary_key=True),
    Column("category_id", ForeignKey("categories.id", ondelete="CASCADE"), primary_key=True),
)

