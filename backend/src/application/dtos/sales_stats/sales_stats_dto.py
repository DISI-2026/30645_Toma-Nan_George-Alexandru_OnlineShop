from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

SalesStatsGroupBy = Literal["category", "region", "period"]
SalesStatsPeriod = Literal["day", "week", "month"]


class SalesStatsSeriesItemDTO(BaseModel):
    id: int | None
    label: str
    revenue: float = Field(ge=0)
    orders: int = Field(ge=0)
    percentage: float = Field(ge=0)


class SalesStatsResponseDTO(BaseModel):
    group_by: SalesStatsGroupBy
    total_revenue: float = Field(ge=0)
    total_orders: int = Field(ge=0)
    series: list[SalesStatsSeriesItemDTO]
