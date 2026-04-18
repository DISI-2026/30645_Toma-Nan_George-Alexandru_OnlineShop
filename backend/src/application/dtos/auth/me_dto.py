from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class BuyerMeDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    address: str | None = Field(default=None, max_length=500)
    preferred_category_ids: list[int] = Field(default_factory=list)


class SellerMeDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    company_name: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=4000)
    logo_url: str | None = Field(default=None, max_length=1024)


class MeResponseDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    role: str
    buyer: BuyerMeDTO | None = None
    seller: SellerMeDTO | None = None

