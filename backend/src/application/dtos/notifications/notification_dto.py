from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from models import NotificationType


class NotificationItemDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    type: NotificationType
    title: str
    message: str
    is_read: bool
    meta: dict[str, Any]
    created_at: datetime


class NotificationListResponseDTO(BaseModel):
    items: list[NotificationItemDTO]
    unread_count: int = Field(ge=0)
    page: int = Field(ge=1)
    page_size: int = Field(ge=1)
    total: int = Field(ge=0)


class NotificationReadResponseDTO(BaseModel):
    id: int | None
    is_read: bool
    updated_count: int = Field(ge=0)
