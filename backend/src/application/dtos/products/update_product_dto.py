from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class UpdateProductRequestDTO(BaseModel):
    title: str | None = Field(None, max_length=255)
    description: str | None = None
    price: Decimal | None = Field(None, ge=0, decimal_places=2)
    stock: int | None = Field(None, ge=0)
    is_available: bool | None = None
    category_id: int | None = Field(None, gt=0)


class UpdateProductResponseDTO(BaseModel):
    id: int
    seller_id: int
    category_id: int
    title: str
    description: str | None
    price: Decimal
    stock: int
    is_available: bool
    avg_rating: Decimal | None
    review_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
