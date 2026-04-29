from __future__ import annotations

from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field


class ListProductsQueryDTO(BaseModel):
    q: str | None = None
    category_id: int | None = Field(default=None, ge=1)
    seller_id: int | None = Field(default=None, ge=1)
    min_price: Decimal | None = Field(default=None, ge=0)
    max_price: Decimal | None = Field(default=None, ge=0)
    min_rating: Decimal | None = Field(default=None, ge=0, le=5)
    is_available: bool = True
    sort: Literal["price_asc", "price_desc", "rating_desc", "newest"] = "newest"
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


class ProductListCategoryDTO(BaseModel):
    id: int
    name: str


class ProductListSellerDTO(BaseModel):
    id: int
    company_name: str
    logo_url: str | None


class ProductListItemDTO(BaseModel):
    id: int
    title: str
    slug: str
    price: Decimal
    stock: int
    is_available: bool
    thumbnail_url: str | None
    avg_rating: Decimal | None
    review_count: int
    category: ProductListCategoryDTO
    seller: ProductListSellerDTO


class ProductListPaginationDTO(BaseModel):
    page: int
    page_size: int
    total_items: int
    total_pages: int


class ListProductsResponseDTO(BaseModel):
    data: list[ProductListItemDTO]
    pagination: ProductListPaginationDTO
