from __future__ import annotations

import enum
from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Index, JSON, String, desc, func
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class NotificationType(str, enum.Enum):
    NEW_ORDER = "new_order"
    NEW_REVIEW = "new_review"
    ORDER_STATUS_CHANGED = "order_status_changed"
    ORDER_CANCELLED_BY_BUYER = "order_cancelled_by_buyer"
    ORDER_CANCELLED_BY_SELLER = "order_cancelled_by_seller"
    REVIEW_REPLY = "review_reply"
    MESSAGE = "message"


class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = (
        Index(
            "ix_notifications_user_id_is_read_created_at_desc",
            "user_id",
            "is_read",
            desc("created_at"),
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    type: Mapped[NotificationType] = mapped_column(
        Enum(NotificationType, name="notification_type", native_enum=False),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(String(1000), nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    meta: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
