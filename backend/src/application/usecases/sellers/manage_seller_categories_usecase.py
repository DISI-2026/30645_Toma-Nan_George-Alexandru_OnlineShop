from __future__ import annotations

from dataclasses import dataclass, field

from sqlalchemy import and_, delete, func, insert, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from application.dtos.sellers import (
    AdminSellerAssignedCategoryDTO,
    AdminSellerListResponseDTO,
    AdminSellerWithCategoriesDTO,
    SellerCategoryAssignmentResponseDTO,
)
from application.exceptions import (
    AdminSellerCategoryNotFoundError,
    AdminSellerNotFoundError,
    SellerCategoryAssignmentAlreadyExistsError,
    SellerCategoryAssignmentDeleteBlockedError,
    SellerCategoryAssignmentNotFoundError,
)
from models import Category, Product, Seller
from models.seller_category import seller_categories


@dataclass(slots=True)
class _SellerListItem:
    seller_id: int
    company_name: str
    categories: list[AdminSellerAssignedCategoryDTO] = field(default_factory=list)


class ManageSellerCategoriesUseCase:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def assign_category(
        self,
        seller_id: int,
        category_id: int,
    ) -> SellerCategoryAssignmentResponseDTO:
        await self._ensure_seller_exists(seller_id)
        await self._ensure_category_exists(category_id)

        statement = (
            insert(seller_categories)
            .values(seller_id=seller_id, category_id=category_id)
            .returning(
                seller_categories.c.seller_id,
                seller_categories.c.category_id,
                seller_categories.c.assigned_at,
            )
        )
        try:
            result = await self._session.execute(statement)
            await self._session.commit()
        except IntegrityError as exc:
            await self._session.rollback()
            raise SellerCategoryAssignmentAlreadyExistsError(
                "Seller is already assigned to this category."
            ) from exc

        row = result.one()
        return SellerCategoryAssignmentResponseDTO(
            seller_id=row.seller_id,
            category_id=row.category_id,
            assigned_at=row.assigned_at,
        )

    async def remove_category(self, seller_id: int, category_id: int) -> None:
        await self._ensure_seller_exists(seller_id)
        await self._ensure_category_exists(category_id)
        if not await self._assignment_exists(seller_id, category_id):
            raise SellerCategoryAssignmentNotFoundError(
                "Seller category assignment not found."
            )

        active_products = await self._session.scalar(
            select(func.count(Product.id)).where(
                Product.seller_id == seller_id,
                Product.category_id == category_id,
                Product.is_available.is_(True),
                Product.stock > 0,
            )
        )
        if active_products:
            raise SellerCategoryAssignmentDeleteBlockedError(
                "Seller category assignment cannot be removed while active products exist in this category."
            )

        await self._session.execute(
            delete(seller_categories).where(
                seller_categories.c.seller_id == seller_id,
                seller_categories.c.category_id == category_id,
            )
        )
        await self._session.commit()

    async def list_sellers(
        self,
        page: int,
        page_size: int,
        category_id: int | None,
    ) -> AdminSellerListResponseDTO:
        page = max(page, 1)
        page_size = min(max(page_size, 1), 100)
        offset = (page - 1) * page_size

        filters = []
        if category_id is not None:
            await self._ensure_category_exists(category_id)
            filters.append(seller_categories.c.category_id == category_id)

        seller_ids_query = (
            select(Seller.id)
            .select_from(Seller)
            .outerjoin(seller_categories, seller_categories.c.seller_id == Seller.id)
        )
        if filters:
            seller_ids_query = seller_ids_query.where(and_(*filters))

        seller_ids_subquery = seller_ids_query.distinct().subquery()
        total = await self._session.scalar(
            select(func.count()).select_from(seller_ids_subquery)
        ) or 0

        paged_sellers = (
            select(Seller.id, Seller.company_name)
            .where(Seller.id.in_(select(seller_ids_subquery.c.id)))
            .order_by(Seller.company_name, Seller.id)
            .offset(offset)
            .limit(page_size)
            .subquery()
        )

        result = await self._session.execute(
            select(
                paged_sellers.c.id.label("seller_id"),
                paged_sellers.c.company_name,
                Category.id.label("category_id"),
                Category.name.label("category_name"),
                Category.slug.label("category_slug"),
                seller_categories.c.assigned_at,
            )
            .select_from(paged_sellers)
            .outerjoin(
                seller_categories,
                seller_categories.c.seller_id == paged_sellers.c.id,
            )
            .outerjoin(Category, Category.id == seller_categories.c.category_id)
            .order_by(paged_sellers.c.company_name, Category.name)
        )

        sellers: dict[int, _SellerListItem] = {}
        for row in result.all():
            item = sellers.setdefault(
                row.seller_id,
                _SellerListItem(
                    seller_id=row.seller_id,
                    company_name=row.company_name,
                ),
            )
            if row.category_id is not None:
                item.categories.append(
                    AdminSellerAssignedCategoryDTO(
                        id=row.category_id,
                        name=row.category_name,
                        slug=row.category_slug,
                        assigned_at=row.assigned_at,
                    )
                )

        return AdminSellerListResponseDTO(
            items=[
                AdminSellerWithCategoriesDTO(
                    seller_id=item.seller_id,
                    company_name=item.company_name,
                    categories=item.categories,
                )
                for item in sellers.values()
            ],
            page=page,
            page_size=page_size,
            total=total,
        )

    async def _ensure_seller_exists(self, seller_id: int) -> None:
        exists = await self._session.scalar(select(Seller.id).where(Seller.id == seller_id))
        if exists is None:
            raise AdminSellerNotFoundError("Seller not found.")

    async def _ensure_category_exists(self, category_id: int) -> None:
        exists = await self._session.scalar(
            select(Category.id).where(Category.id == category_id)
        )
        if exists is None:
            raise AdminSellerCategoryNotFoundError("Category not found.")

    async def _assignment_exists(self, seller_id: int, category_id: int) -> bool:
        exists = await self._session.scalar(
            select(seller_categories.c.seller_id).where(
                seller_categories.c.seller_id == seller_id,
                seller_categories.c.category_id == category_id,
            )
        )
        return exists is not None
