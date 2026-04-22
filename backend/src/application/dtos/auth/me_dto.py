from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class BuyerFavoriteCategoryDTO(BaseModel):
    category_id: int = Field(gt=0)
    category_name: str = Field(min_length=1, max_length=255)


class BuyerPriceRangeDTO(BaseModel):
    min: Decimal | None = Field(default=None, ge=0, max_digits=10, decimal_places=2)
    max: Decimal | None = Field(default=None, ge=0, max_digits=10, decimal_places=2)


class BuyerPreferencesDTO(BaseModel):
    favorite_categories: list[BuyerFavoriteCategoryDTO] = Field(default_factory=list)
    price_range: BuyerPriceRangeDTO = Field(default_factory=BuyerPriceRangeDTO)


class BuyerMeDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str | None = Field(default=None, max_length=255)
    email: str = Field(
        min_length=3, max_length=320, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
    )
    phone: str | None = Field(default=None, max_length=50)
    address: str | None = Field(default=None, max_length=500)
    preferences: BuyerPreferencesDTO = Field(default_factory=BuyerPreferencesDTO)
    created_at: datetime


class UpdateBuyerPriceRangeDTO(BaseModel):
    min: Decimal | None = Field(default=None, ge=0, max_digits=10, decimal_places=2)
    max: Decimal | None = Field(default=None, ge=0, max_digits=10, decimal_places=2)

    @model_validator(mode="after")
    def validate_range(self) -> "UpdateBuyerPriceRangeDTO":
        if self.min is not None and self.max is not None and self.max < self.min:
            raise ValueError("preferences.price_range.max must be >= min.")
        return self


class UpdateBuyerPreferencesDTO(BaseModel):
    favorite_categories: list[int] | None = None
    price_range: UpdateBuyerPriceRangeDTO | None = None

    @model_validator(mode="after")
    def validate_favorite_categories(self) -> "UpdateBuyerPreferencesDTO":
        if self.favorite_categories and any(
            category_id <= 0 for category_id in self.favorite_categories
        ):
            raise ValueError(
                "preferences.favorite_categories must contain only positive ids."
            )
        return self


class UpdateBuyerProfileRequestDTO(BaseModel):
    model_config = ConfigDict(extra="forbid")

    full_name: str | None = Field(max_length=255, default=None)
    phone: str | None = Field(max_length=50, default=None)
    address: str | None = Field(max_length=500, default=None)
    preferences: UpdateBuyerPreferencesDTO | None = None


class SellerMeDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    company_name: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=4000)
    phone: str | None = Field(default=None, max_length=50)
    address: str | None = Field(default=None, max_length=500)
    tax_id: str | None = Field(default=None, max_length=20)
    logo_url: str | None = Field(default=None, max_length=1024)


class MeResponseDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    role: str
    buyer: BuyerMeDTO | None = None
    seller: SellerMeDTO | None = None
