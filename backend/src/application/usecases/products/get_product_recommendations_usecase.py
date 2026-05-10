from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from application.dtos.products import (
    GetProductRecommendationsResponseDTO,
    ProductListCategoryDTO,
    ProductListItemDTO,
    ProductListSellerDTO,
)
from application.services.neo4j_service import Neo4jService
from models import Buyer, Order, OrderItem, Product, ProductImage, Seller, Category


class GetProductRecommendationsUseCase:
    def __init__(self, session: AsyncSession, neo4j_service: Neo4jService) -> None:
        self._session = session
        self._neo4j_service = neo4j_service

    async def execute(
        self,
        *,
        limit: int,
        user_id: int | None,
        role: str | None,
    ) -> GetProductRecommendationsResponseDTO:
        if role == "buyer" and user_id is not None:
            buyer_id = await self._get_buyer_id(user_id)
            if buyer_id is not None:
                bought_product_ids = await self._get_bought_product_ids(buyer_id)
                if bought_product_ids:
                    related_ids = await self._neo4j_service.get_related_products(
                        bought_product_ids,
                        limit,
                    )
                    products = await self._load_product_cards_by_ids(related_ids, limit)
                    return GetProductRecommendationsResponseDTO(
                        recommendations=products,
                        source="personalized",
                    )

        popular_ids = await self._get_popular_product_ids(limit)
        products = await self._load_product_cards_by_ids(popular_ids, limit)

        return GetProductRecommendationsResponseDTO(
            recommendations=products,
            source="popular",
        )

    async def _get_buyer_id(self, user_id: int) -> int | None:
        statement = select(Buyer.id).where(Buyer.user_id == user_id)
        return (await self._session.execute(statement)).scalar_one_or_none()

    async def _get_bought_product_ids(self, buyer_id: int) -> list[int]:
        statement = (
            select(OrderItem.product_id)
            .join(Order, Order.id == OrderItem.order_id)
            .where(Order.buyer_id == buyer_id)
            .group_by(OrderItem.product_id)
        )
        return list((await self._session.execute(statement)).scalars())

    async def _get_popular_product_ids(self, limit: int) -> list[int]:
        statement = (
            select(OrderItem.product_id)
            .join(Order, Order.id == OrderItem.order_id)
            .group_by(OrderItem.product_id)
            .order_by(func.sum(OrderItem.quantity).desc(), func.max(Order.placed_at).desc())
            .limit(limit)
        )
        return list((await self._session.execute(statement)).scalars())

    async def _load_product_cards_by_ids(
        self,
        product_ids: list[int],
        limit: int,
    ) -> list[ProductListItemDTO]:
        if not product_ids:
            return []

        statement = self._product_cards_statement().where(
            Product.id.in_(product_ids),
            Product.is_available.is_(True),
        )
        rows = (await self._session.execute(statement)).all()
        by_id = {row.id: self._to_product_list_item(row) for row in rows}

        ordered: list[ProductListItemDTO] = []
        for product_id in product_ids:
            item = by_id.get(product_id)
            if item is not None:
                ordered.append(item)
            if len(ordered) >= limit:
                break
        return ordered

    def _product_cards_statement(self):
        thumbnail_path_subquery = (
            select(ProductImage.path)
            .where(
                ProductImage.product_id == Product.id,
                ProductImage.is_thumbnail.is_(True),
            )
            .order_by(ProductImage.display_order.asc(), ProductImage.id.asc())
            .limit(1)
            .scalar_subquery()
        )

        return (
            select(
                Product.id,
                Product.title,
                Product.slug,
                Product.price,
                Product.stock,
                Product.is_available,
                Product.avg_rating,
                Product.review_count,
                Product.category_id.label("category_id"),
                Category.name.label("category_name"),
                Product.seller_id.label("seller_id"),
                Seller.company_name.label("seller_company_name"),
                Seller.logo_path.label("seller_logo_path"),
                thumbnail_path_subquery.label("thumbnail_path"),
            )
            .join(Category, Category.id == Product.category_id)
            .join(Seller, Seller.id == Product.seller_id)
        )

    def _to_product_list_item(self, row) -> ProductListItemDTO:
        return ProductListItemDTO(
            id=row.id,
            title=row.title,
            slug=row.slug,
            price=row.price,
            stock=row.stock,
            is_available=row.is_available,
            thumbnail_url=self._to_media_url(row.thumbnail_path),
            avg_rating=row.avg_rating,
            review_count=row.review_count,
            category=ProductListCategoryDTO(
                id=row.category_id,
                name=row.category_name,
            ),
            seller=ProductListSellerDTO(
                id=row.seller_id,
                company_name=row.seller_company_name,
                logo_url=self._to_media_url(row.seller_logo_path),
            ),
        )

    def _to_media_url(self, path: str | None) -> str | None:
        if path is None:
            return None
        lowered = path.lower()
        if lowered.startswith(("http://", "https://")):
            return path
        return f"/media/{path.lstrip('/')}"
