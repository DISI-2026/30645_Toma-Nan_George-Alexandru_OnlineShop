from __future__ import annotations

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from application.dtos.products import (
    ListProductsQueryDTO,
    ListProductsResponseDTO,
    ProductListCategoryDTO,
    ProductListItemDTO,
    ProductListPaginationDTO,
    ProductListSellerDTO,
)
from models import Category, Product, ProductImage, Seller

from .update_product_usecase import InvalidFieldError


class ListProductsUseCase:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def execute(self, query: ListProductsQueryDTO) -> ListProductsResponseDTO:
        if (
            query.min_price is not None
            and query.max_price is not None
            and query.min_price > query.max_price
        ):
            raise InvalidFieldError("min_price", "min_price must be less than or equal to max_price.")

        filters = [Product.is_available.is_(query.is_available)]

        cleaned_q = (query.q or "").strip()
        if cleaned_q:
            pattern = f"%{cleaned_q}%"
            filters.append(
                or_(
                    Product.title.ilike(pattern),
                    Product.description.ilike(pattern),
                )
            )

        if query.category_id is not None:
            filters.append(Product.category_id == query.category_id)
        if query.seller_id is not None:
            filters.append(Product.seller_id == query.seller_id)
        if query.min_price is not None:
            filters.append(Product.price >= query.min_price)
        if query.max_price is not None:
            filters.append(Product.price <= query.max_price)
        if query.min_rating is not None:
            filters.append(Product.avg_rating >= query.min_rating)

        where_clause = and_(*filters)
        total_statement = select(func.count(Product.id)).where(where_clause)
        total_items = (await self._session.execute(total_statement)).scalar_one()

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

        statement = (
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
            .where(where_clause)
            .order_by(*self._build_order_by(query.sort))
            .offset((query.page - 1) * query.page_size)
            .limit(query.page_size)
        )

        rows = (await self._session.execute(statement)).all()
        total_pages = (total_items + query.page_size - 1) // query.page_size if total_items else 0

        return ListProductsResponseDTO(
            data=[
                ProductListItemDTO(
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
                for row in rows
            ],
            pagination=ProductListPaginationDTO(
                page=query.page,
                page_size=query.page_size,
                total_items=total_items,
                total_pages=total_pages,
            ),
        )

    def _build_order_by(self, sort: str):
        if sort == "price_asc":
            return (Product.price.asc(), Product.id.asc())
        if sort == "price_desc":
            return (Product.price.desc(), Product.id.desc())
        if sort == "rating_desc":
            return (func.coalesce(Product.avg_rating, 0).desc(), Product.review_count.desc(), Product.id.desc())
        return (Product.created_at.desc(), Product.id.desc())

    def _to_media_url(self, path: str | None) -> str | None:
        if path is None:
            return None
        lowered = path.lower()
        if lowered.startswith(("http://", "https://")):
            return path
        return f"/media/{path.lstrip('/')}"
