from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from application.dtos.pricing import PriceSuggestionDTO, PriceSuggestionsResponseDTO
from application.services.pricing_engine import PricingEngine, PriceSuggestionData
from application.usecases.products.update_product_usecase import (
    ProductNotFoundError,
    ProductNotOwnedBySellerError,
)
from models import Order, OrderItem, PriceSuggestion, Product


class GetPriceSuggestionsUseCase:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._engine = PricingEngine()

    async def execute(
        self, seller_id: int, product_id: int | None
    ) -> PriceSuggestionsResponseDTO:
        if product_id is not None:
            products = [await self._fetch_single_product(seller_id, product_id)]
        else:
            products = await self._fetch_top_products(seller_id)

        suggestions = []
        for product in products:
            daily_counts, total = await self._fetch_order_data(product.id, days=30)
            data = self._engine.compute(
                product_id=product.id,
                product_title=product.title,
                current_price=product.price,
                daily_counts=daily_counts,
                total_orders=total,
            )
            await self._upsert_suggestion(product.id, data)
            suggestions.append(self._to_dto(data))

        return PriceSuggestionsResponseDTO(suggestions=suggestions)

    async def _fetch_single_product(self, seller_id: int, product_id: int) -> Product:
        product = await self._session.get(Product, product_id)
        if product is None:
            raise ProductNotFoundError("Product not found.")
        if product.seller_id != seller_id:
            raise ProductNotOwnedBySellerError("You can only view suggestions for your own products.")
        return product

    async def _fetch_top_products(self, seller_id: int) -> list[Product]:
        cutoff = datetime.now(timezone.utc) - timedelta(days=30)

        revenue_subq = (
            select(
                OrderItem.product_id,
                func.sum(OrderItem.subtotal).label("revenue"),
            )
            .join(Order, OrderItem.order_id == Order.id)
            .where(Order.seller_id == seller_id)
            .where(Order.placed_at >= cutoff)
            .group_by(OrderItem.product_id)
            .subquery()
        )

        stmt = (
            select(Product)
            .outerjoin(revenue_subq, Product.id == revenue_subq.c.product_id)
            .where(Product.seller_id == seller_id)
            .order_by(func.coalesce(revenue_subq.c.revenue, 0).desc())
            .limit(100)
        )

        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def _fetch_order_data(
        self, product_id: int, days: int
    ) -> tuple[list[int], int]:
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)

        stmt = (
            select(Order.placed_at)
            .join(OrderItem, OrderItem.order_id == Order.id)
            .where(OrderItem.product_id == product_id)
            .where(Order.placed_at >= cutoff)
        )

        result = await self._session.execute(stmt)
        rows = result.scalars().all()

        now = datetime.now(timezone.utc)
        buckets: list[int] = [0] * days
        for placed_at in rows:
            if placed_at.tzinfo is None:
                placed_at = placed_at.replace(tzinfo=timezone.utc)
            day_offset = (now - placed_at).days
            if 0 <= day_offset < days:
                buckets[days - 1 - day_offset] += 1

        return buckets, len(rows)

    async def _upsert_suggestion(self, product_id: int, data: PriceSuggestionData) -> None:
        existing = await self._session.scalar(
            select(PriceSuggestion).where(PriceSuggestion.product_id == product_id)
        )

        if existing:
            existing.current_price = data.current_price
            existing.suggested_price = data.suggested_price
            existing.change_percent = data.change_percent
            existing.direction = data.direction
            existing.confidence = data.confidence
            existing.reasoning = data.reasoning
            existing.demand_trend = data.demand_trend
            existing.data_period_days = data.data_period_days
            existing.insufficient_data = data.insufficient_data
        else:
            self._session.add(
                PriceSuggestion(
                    product_id=product_id,
                    current_price=data.current_price,
                    suggested_price=data.suggested_price,
                    change_percent=data.change_percent,
                    direction=data.direction,
                    confidence=data.confidence,
                    reasoning=data.reasoning,
                    demand_trend=data.demand_trend,
                    data_period_days=data.data_period_days,
                    insufficient_data=data.insufficient_data,
                )
            )

        await self._session.flush()

    def _to_dto(self, data: PriceSuggestionData) -> PriceSuggestionDTO:
        return PriceSuggestionDTO(
            product_id=data.product_id,
            product_title=data.product_title,
            current_price=data.current_price,
            suggested_price=data.suggested_price,
            change_percent=data.change_percent,
            direction=data.direction,
            confidence=data.confidence,
            reasoning=data.reasoning,
            demand_trend=data.demand_trend,
            data_period_days=data.data_period_days,
            insufficient_data=data.insufficient_data,
        )
