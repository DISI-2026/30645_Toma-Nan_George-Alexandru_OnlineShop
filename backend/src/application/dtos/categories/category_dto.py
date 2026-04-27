from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class CategoryCreateRequestDTO(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=5000)


class CategoryUpdateRequestDTO(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=5000)


class CategoryPatchRequestDTO(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=5000)


class CategoryResponseDTO(BaseModel):
    id: int
    name: str
    description: str | None
    slug: str
    product_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CategoryListResponseDTO(BaseModel):
    items: list[CategoryResponseDTO]
    page: int
    page_size: int
    total: int
