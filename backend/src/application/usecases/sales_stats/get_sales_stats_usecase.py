from __future__ import annotations

from datetime import date, datetime, time, timedelta
from decimal import Decimal
from typing import Any

from sqlalchemy import cast, distinct, func, literal, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql.elements import ColumnElement
from sqlalchemy.types import Integer, String

from application.dtos.sales_stats import (
    SalesStatsGroupBy,
    SalesStatsPeriod,
    SalesStatsResponseDTO,
    SalesStatsSeriesItemDTO,
)
from application.exceptions import InvalidSalesStatsQueryError
from models import Category, Order, OrderItem, OrderStatus, Product


class GetSalesStatsUseCase:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def execute(
        self,
        group_by: SalesStatsGroupBy,
        date_from: date,
        date_to: date,
        period: SalesStatsPeriod | None,
    ) -> SalesStatsResponseDTO:
        self._validate(group_by, date_from, date_to, period)
        start_at = datetime.combine(date_from, time.min)
        end_before = datetime.combine(date_to + timedelta(days=1), time.min)

        total_revenue, total_orders = await self._totals(start_at, end_before)
        rows = await self._series(group_by, start_at, end_before, period)

        total_revenue_float = self._to_float(total_revenue)
        series = [
            SalesStatsSeriesItemDTO(
                id=row.id,
                label=row.label or "Unknown",
                revenue=self._to_float(row.revenue),
                orders=row.orders,
                percentage=self._percentage(row.revenue, total_revenue),
            )
            for row in rows
        ]

        return SalesStatsResponseDTO(
            group_by=group_by,
            total_revenue=total_revenue_float,
            total_orders=total_orders,
            series=series,
        )

    def _validate(
        self,
        group_by: SalesStatsGroupBy,
        date_from: date,
        date_to: date,
        period: SalesStatsPeriod | None,
    ) -> None:
        if date_from > date_to:
            raise InvalidSalesStatsQueryError("date_from must be before or equal to date_to.")
        if group_by == "period" and period is None:
            raise InvalidSalesStatsQueryError("period is required when group_by is period.")

    async def _totals(self, start_at: datetime, end_before: datetime) -> tuple[Decimal, int]:
        statement = (
            select(
                func.coalesce(func.sum(OrderItem.subtotal), 0),
                func.count(distinct(Order.id)),
            )
            .select_from(Order)
            .join(OrderItem, OrderItem.order_id == Order.id)
            .where(*self._base_filters(start_at, end_before))
        )
        row = (await self._session.execute(statement)).one()
        return row[0], row[1]

    async def _series(
        self,
        group_by: SalesStatsGroupBy,
        start_at: datetime,
        end_before: datetime,
        period: SalesStatsPeriod | None,
    ) -> list[Any]:
        id_expr, label_expr = self._grouping_expressions(group_by, period)
        statement = (
            select(
                id_expr.label("id"),
                label_expr.label("label"),
                func.coalesce(func.sum(OrderItem.subtotal), 0).label("revenue"),
                func.count(distinct(Order.id)).label("orders"),
            )
            .select_from(Order)
            .join(OrderItem, OrderItem.order_id == Order.id)
            .join(Product, Product.id == OrderItem.product_id)
            .join(Category, Category.id == Product.category_id)
            .where(*self._base_filters(start_at, end_before))
            .group_by(id_expr, label_expr)
            .order_by(func.coalesce(func.sum(OrderItem.subtotal), 0).desc(), label_expr.asc())
        )
        return list((await self._session.execute(statement)).all())

    def _base_filters(self, start_at: datetime, end_before: datetime) -> list[ColumnElement[bool]]:
        return [
            Order.status == OrderStatus.DELIVERED,
            Order.placed_at >= start_at,
            Order.placed_at < end_before,
        ]

    def _grouping_expressions(
        self,
        group_by: SalesStatsGroupBy,
        period: SalesStatsPeriod | None,
    ) -> tuple[ColumnElement[int | None], ColumnElement[str]]:
        if group_by == "category":
            return Category.id, Category.name
        if group_by == "region":
            return literal(None).cast(Integer), self._city_expression()
        return literal(None).cast(Integer), self._period_expression(period)

    def _city_expression(self) -> ColumnElement[str]:
        dialect = self._dialect_name()
        if dialect == "sqlite":
            city = func.json_extract(Order.delivery_address, "$.city")
        else:
            city = Order.delivery_address["city"].as_string()
        return func.coalesce(func.nullif(cast(city, String), ""), "Unknown")

    def _period_expression(self, period: SalesStatsPeriod | None) -> ColumnElement[str]:
        dialect = self._dialect_name()
        if dialect == "sqlite":
            if period == "day":
                return func.strftime("%Y-%m-%d", Order.placed_at)
            if period == "week":
                return func.strftime("%Y-W%W", Order.placed_at)
            return func.strftime("%Y-%m", Order.placed_at)

        if period == "day":
            return func.to_char(func.date_trunc("day", Order.placed_at), "YYYY-MM-DD")
        if period == "week":
            return func.to_char(func.date_trunc("week", Order.placed_at), 'IYYY-"W"IW')
        return func.to_char(func.date_trunc("month", Order.placed_at), "YYYY-MM")

    def _dialect_name(self) -> str:
        bind = self._session.get_bind()
        return bind.dialect.name

    def _to_float(self, value: Decimal | int | float | None) -> float:
        if value is None:
            return 0.0
        return round(float(value), 2)

    def _percentage(
        self,
        revenue: Decimal | int | float | None,
        total: Decimal | int | float | None,
    ) -> float:
        total_float = self._to_float(total)
        if total_float == 0:
            return 0.0
        return round((self._to_float(revenue) / total_float) * 100, 2)
