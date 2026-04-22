from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from models import OrderStatus


class OrderBuyerSummaryDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str = Field(max_length=320)
    full_name: str | None = Field(default=None, max_length=255)


class OrderItemDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    product_title: str
    quantity: int = Field(ge=1)
    unit_price: Decimal
    subtotal: Decimal


class OrderStatusHistoryDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: OrderStatus
    changed_at: datetime
    changed_by_role: str


class SellerOrderListItemDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    order_number: str
    buyer: OrderBuyerSummaryDTO
    items: list[OrderItemDTO]
    total: Decimal
    status: OrderStatus
    placed_at: datetime


class SellerOrderListResponseDTO(BaseModel):
    items: list[SellerOrderListItemDTO]
    page: int = Field(ge=1)
    page_size: int = Field(ge=1)
    total: int = Field(ge=0)


class OrderDetailsResponseDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    order_number: str
    buyer: OrderBuyerSummaryDTO
    seller_id: int
    delivery_address: dict[str, Any]
    notes: str | None
    items: list[OrderItemDTO]
    total: Decimal
    status: OrderStatus
    placed_at: datetime
    updated_at: datetime
    status_history: list[OrderStatusHistoryDTO]


class UpdateOrderStatusRequestDTO(BaseModel):
    status: OrderStatus


class UpdateOrderStatusResponseDTO(BaseModel):
    id: int
    status: OrderStatus
    valid_next_transitions: list[OrderStatus]
