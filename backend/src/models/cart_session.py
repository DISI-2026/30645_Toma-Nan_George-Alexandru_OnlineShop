from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .buyer import Buyer
    from .cart_item import CartItem


class CartSession(Base):
    __tablename__ = "cart_sessions"

    buyer_id: Mapped[int] = mapped_column(
        ForeignKey("buyers.id", ondelete="CASCADE"),
        primary_key=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    buyer: Mapped[Buyer] = relationship(back_populates="cart_session")
    items: Mapped[list[CartItem]] = relationship(
        back_populates="cart_session",
        cascade="all, delete-orphan",
        order_by="CartItem.id",
    )
