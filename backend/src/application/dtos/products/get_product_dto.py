from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel


class ProductImagePublicDTO(BaseModel):
    id: int
    url: str
    is_thumbnail: bool
    order: int


class ProductCategoryPublicDTO(BaseModel):
    id: int
    name: str


class ProductSellerPublicDTO(BaseModel):
    id: int
    company_name: str
    logo_url: str | None
    avg_rating: Decimal | None


class GetProductResponseDTO(BaseModel):
    id: int
    title: str
    slug: str
    description: str | None
    price: Decimal
    stock: int
    is_available: bool
    images: list[ProductImagePublicDTO]
    avg_rating: Decimal | None
    review_count: int
    category: ProductCategoryPublicDTO
    seller: ProductSellerPublicDTO
    created_at: datetime
    updated_at: datetime
