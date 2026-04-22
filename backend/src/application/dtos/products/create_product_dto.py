from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class CreateProductRequestDTO(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    description: str = Field(..., min_length=10, max_length=5000)
    price: Decimal = Field(..., gt=0, decimal_places=2)
    stock: int = Field(..., ge=0)
    category_id: int = Field(..., gt=0)


class ProductImageDTO(BaseModel):
    id: int
    path: str
    is_thumbnail: bool
    display_order: int

    class Config:
        from_attributes = True


class CreateProductResponseDTO(BaseModel):
    id: int
    seller_id: int
    category_id: int
    title: str
    slug: str
    description: str | None
    price: Decimal
    stock: int
    is_available: bool
    avg_rating: Decimal | None
    review_count: int
    created_at: datetime
    updated_at: datetime
    images: list[ProductImageDTO]

    class Config:
        from_attributes = True
