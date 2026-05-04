from __future__ import annotations

from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class CartItemPayloadDTO(BaseModel):
    product_id: int = Field(ge=1)
    quantity: int = Field(ge=1)


class CartItemQuantityUpdateDTO(BaseModel):
    quantity: int = Field(ge=1)


class CartItemResponseDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    product_title: str
    quantity: int
    unit_price: Decimal
    current_price: Decimal
    subtotal: Decimal


class CartResponseDTO(BaseModel):
    items: list[CartItemResponseDTO]
    total: Decimal
    current_total: Decimal
    price_changed: bool
