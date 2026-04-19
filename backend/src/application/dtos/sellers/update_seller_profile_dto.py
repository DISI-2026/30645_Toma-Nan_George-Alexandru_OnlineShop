from __future__ import annotations

from pydantic import BaseModel, Field

from .get_seller_profile_dto import SellerProfilePrivateDTO


class UpdateSellerProfileRequestDTO(BaseModel):
    company_name: str | None = Field(default=None, min_length=2, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    phone: str | None = Field(default=None, max_length=50)
    address: str | None = Field(default=None, max_length=500)
    tax_id: str | None = Field(default=None, max_length=20)


class UpdateSellerProfileResponseDTO(SellerProfilePrivateDTO):
    pass
