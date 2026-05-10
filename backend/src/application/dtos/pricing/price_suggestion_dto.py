from __future__ import annotations

from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class PriceSuggestionDTO(BaseModel):
    product_id: int
    product_title: str
    current_price: Decimal
    suggested_price: Decimal
    change_percent: Decimal
    direction: str
    confidence: Decimal
    reasoning: str
    demand_trend: str
    data_period_days: int
    insufficient_data: bool

    model_config = ConfigDict(from_attributes=True)


class PriceSuggestionsResponseDTO(BaseModel):
    suggestions: list[PriceSuggestionDTO]
