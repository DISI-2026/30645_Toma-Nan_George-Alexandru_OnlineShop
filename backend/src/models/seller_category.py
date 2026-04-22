from __future__ import annotations

from sqlalchemy import Column, ForeignKey, Integer, Table

from .base import Base

seller_categories = Table(
    "seller_categories",
    Base.metadata,
    Column("id", Integer, primary_key=True),
    Column("seller_id", Integer, ForeignKey("sellers.id", ondelete="CASCADE"), nullable=False),
    Column("category_id", Integer, ForeignKey("categories.id", ondelete="CASCADE"), nullable=False),
)
