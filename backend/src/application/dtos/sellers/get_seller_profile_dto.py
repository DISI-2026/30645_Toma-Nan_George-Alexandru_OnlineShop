from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class SellerCategoryDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str


class SellerProfilePublicDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_name: str = Field(min_length=2, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    logo_url: str | None = Field(default=None, max_length=500)
    categories: list[SellerCategoryDTO] = Field(default_factory=list)
    avg_rating: float = Field(default=0.0, ge=0.0, le=5.0)
    total_products: int = Field(default=0, ge=0)
    member_since: datetime


class SellerProfilePrivateDTO(SellerProfilePublicDTO):
    email: str = Field(max_length=320)
    phone: str | None = Field(default=None, max_length=50)
    address: str | None = Field(default=None, max_length=500)
    tax_id: str | None = Field(default=None, max_length=20)
