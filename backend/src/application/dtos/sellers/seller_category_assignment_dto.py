from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class AssignSellerCategoryRequestDTO(BaseModel):
    category_id: int = Field(..., gt=0)


class SellerCategoryAssignmentResponseDTO(BaseModel):
    seller_id: int
    category_id: int
    assigned_at: datetime


class AdminSellerAssignedCategoryDTO(BaseModel):
    id: int
    name: str
    slug: str
    assigned_at: datetime


class AdminSellerWithCategoriesDTO(BaseModel):
    seller_id: int
    company_name: str
    categories: list[AdminSellerAssignedCategoryDTO]


class AdminSellerListResponseDTO(BaseModel):
    items: list[AdminSellerWithCategoriesDTO]
    page: int
    page_size: int
    total: int
