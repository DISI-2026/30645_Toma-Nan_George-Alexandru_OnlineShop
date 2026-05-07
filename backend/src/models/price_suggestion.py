from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, ForeignKey, Integer, Numeric, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class PriceSuggestion(Base):
    __tablename__ = "price_suggestions"

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )
    current_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    suggested_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    change_percent: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    direction: Mapped[str] = mapped_column(nullable=False)
    confidence: Mapped[Decimal | None] = mapped_column(Numeric(3, 2))
    reasoning: Mapped[str | None] = mapped_column(Text)
    demand_trend: Mapped[str] = mapped_column(nullable=False)
    data_period_days: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    insufficient_data: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
