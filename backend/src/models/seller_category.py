from __future__ import annotations

from sqlalchemy import Column, DateTime, ForeignKey, Integer, Table, func

from .base import Base

seller_categories = Table(
    "seller_categories",
    Base.metadata,
    Column("seller_id", Integer, ForeignKey("sellers.id", ondelete="RESTRICT"), primary_key=True),
    Column("category_id", Integer, ForeignKey("categories.id", ondelete="RESTRICT"), primary_key=True),
    Column(
        "assigned_at",
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    ),
)
