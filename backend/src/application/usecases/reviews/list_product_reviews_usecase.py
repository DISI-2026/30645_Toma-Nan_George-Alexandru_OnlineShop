from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from application.exceptions import ProductNotFoundError
from models import Product, Review


class ListProductReviewsUseCase:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def execute(self, product_id_or_slug: str) -> list[Review]:
        product_id = await self._resolve_product_id(product_id_or_slug)
        statement = (
            select(Review)
            .where(Review.product_id == product_id)
            .order_by(Review.created_at.desc(), Review.id.desc())
        )
        return list((await self._session.execute(statement)).scalars().all())

    async def _resolve_product_id(self, product_id_or_slug: str) -> int:
        if product_id_or_slug.isdecimal():
            statement = select(Product.id).where(Product.id == int(product_id_or_slug))
        else:
            statement = select(Product.id).where(Product.slug == product_id_or_slug)

        product_id = (await self._session.execute(statement)).scalar_one_or_none()
        if product_id is None:
            raise ProductNotFoundError("Product not found.")
        return product_id
