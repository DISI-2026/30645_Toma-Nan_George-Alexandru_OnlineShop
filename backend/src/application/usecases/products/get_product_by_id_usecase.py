from __future__ import annotations

from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from application.dtos.products import (
    GetProductResponseDTO,
    ProductCategoryPublicDTO,
    ProductImagePublicDTO,
    ProductSellerPublicDTO,
)
from models import Product

from .update_product_usecase import ProductNotFoundError


class GetProductByIdUseCase:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def execute(self, product_id: int) -> GetProductResponseDTO:
        statement = (
            select(Product)
            .where(Product.id == product_id)
            .options(
                selectinload(Product.images),
                selectinload(Product.category),
                selectinload(Product.seller),
            )
        )
        product = (await self._session.execute(statement)).scalar_one_or_none()
        if product is None:
            raise ProductNotFoundError("Product not found.")

        seller_avg_rating = await self._get_seller_avg_rating(product.seller_id)

        images = sorted(product.images, key=lambda image: image.display_order)
        return GetProductResponseDTO(
            id=product.id,
            title=product.title,
            slug=product.slug,
            description=product.description,
            price=product.price,
            stock=product.stock,
            is_available=product.is_available,
            images=[
                ProductImagePublicDTO(
                    id=image.id,
                    url=self._to_media_url(image.path),
                    is_thumbnail=image.is_thumbnail,
                    order=image.display_order,
                )
                for image in images
            ],
            avg_rating=product.avg_rating,
            review_count=product.review_count,
            category=ProductCategoryPublicDTO(
                id=product.category.id,
                name=product.category.name,
            ),
            seller=ProductSellerPublicDTO(
                id=product.seller.id,
                company_name=product.seller.company_name,
                logo_url=self._to_media_url(product.seller.logo_path),
                avg_rating=seller_avg_rating,
            ),
            created_at=product.created_at,
            updated_at=product.updated_at,
        )

    async def _get_seller_avg_rating(self, seller_id: int) -> Decimal | None:
        statement = select(func.avg(Product.avg_rating)).where(
            Product.seller_id == seller_id,
            Product.avg_rating.is_not(None),
        )
        return (await self._session.execute(statement)).scalar_one_or_none()

    def _to_media_url(self, path: str | None) -> str | None:
        if path is None:
            return None
        lowered = path.lower()
        if lowered.startswith(("http://", "https://")):
            return path
        return f"/media/{path.lstrip('/')}"
