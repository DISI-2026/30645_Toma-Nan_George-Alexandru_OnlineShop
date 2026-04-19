from __future__ import annotations

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class RegisterBaseRequestDTO(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: str = Field(
        min_length=3, max_length=320, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
    )
    password: str = Field(min_length=8, max_length=255)


class RegisterBuyerRequestDTO(RegisterBaseRequestDTO):
    role: Literal["buyer"]
    preferred_category_ids: list[int] = Field(default_factory=list)
    address: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def validate_preferences(self) -> "RegisterBuyerRequestDTO":
        if any(category_id <= 0 for category_id in self.preferred_category_ids):
            raise ValueError("preferred_category_ids must contain only positive ids.")
        return self


class RegisterSellerRequestDTO(RegisterBaseRequestDTO):
    role: Literal["seller"]
    company_name: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=4000)
    logo_url: str | None = Field(default=None, max_length=1024)

    @model_validator(mode="after")
    def normalize_company_name(self) -> "RegisterSellerRequestDTO":
        self.company_name = self.company_name.strip()
        if not self.company_name:
            raise ValueError("company_name is required for seller registration.")
        return self


RegisterRequestDTO = Annotated[
    RegisterBuyerRequestDTO | RegisterSellerRequestDTO,
    Field(discriminator="role"),
]


class RegisteredUserDTO(BaseModel):
    id: int
    email: str
    role: str


class RegisterResponseDTO(BaseModel):
    user: RegisteredUserDTO
