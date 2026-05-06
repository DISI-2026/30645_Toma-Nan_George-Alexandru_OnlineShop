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


class OrderSellerSummaryDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_name: str = Field(max_length=255)


class OrderBuyerDetailsDTO(OrderBuyerSummaryDTO):
    phone: str | None = Field(default=None, max_length=50)
    address: str | None = Field(default=None, max_length=500)


class OrderSellerDetailsDTO(OrderSellerSummaryDTO):
    email: str = Field(max_length=320)
    phone: str | None = Field(default=None, max_length=50)
    address: str | None = Field(default=None, max_length=500)
    tax_id: str | None = Field(default=None, max_length=20)


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


class BuyerOrderListItemDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    order_number: str
    status: OrderStatus
    seller: OrderSellerSummaryDTO
    total: Decimal
    item_count: int = Field(ge=0)
    placed_at: datetime
    updated_at: datetime


class BuyerOrderListPaginationDTO(BaseModel):
    page: int = Field(ge=1)
    page_size: int = Field(ge=1)
    total_items: int = Field(ge=0)
    total_pages: int = Field(ge=0)


class BuyerOrderListResponseDTO(BaseModel):
    data: list[BuyerOrderListItemDTO]
    pagination: BuyerOrderListPaginationDTO


class OrderDetailsResponseDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    order_number: str
    buyer: OrderBuyerDetailsDTO
    seller: OrderSellerDetailsDTO
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


class PlaceOrderRequestDTO(BaseModel):
    delivery_address: str = Field(min_length=1, max_length=1000)
    notes: str | None = Field(default=None, max_length=3000)


class CheckoutOrderDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    order_number: str
    seller_id: int
    items: list[OrderItemDTO]
    total: Decimal
    status: OrderStatus
    placed_at: datetime


class PlaceOrderResponseDTO(BaseModel):
    orders: list[CheckoutOrderDTO]
    order_count: int = Field(ge=0)


class OrderTrackingStatusResponseDTO(BaseModel):
    id: int
    status: OrderStatus
    status_history: list[OrderStatusHistoryDTO]
    last_updated: datetime
