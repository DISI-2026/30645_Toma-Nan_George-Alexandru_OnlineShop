from __future__ import annotations

from dataclasses import dataclass

from slugify import slugify
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from application.dtos.categories import (
    CategoryCreateRequestDTO,
    CategoryListResponseDTO,
    CategoryPatchRequestDTO,
    CategoryResponseDTO,
    CategoryUpdateRequestDTO,
)
from models import Category, Product
from models.seller_category import seller_categories


class CategoryNotFoundError(Exception):
    pass


class CategoryAlreadyExistsError(Exception):
    pass


class CategoryDeleteBlockedError(Exception):
    pass


class InvalidCategoryFieldError(Exception):
    def __init__(self, field: str, message: str):
        super().__init__(f"{field}: {message}")


@dataclass(frozen=True, slots=True)
class CategoryRow:
    category: Category
    product_count: int


class ManageCategoriesUseCase:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_categories(self, page: int, page_size: int) -> CategoryListResponseDTO:
        page = max(page, 1)
        page_size = min(max(page_size, 1), 100)
        offset = (page - 1) * page_size

        total = await self._session.scalar(select(func.count(Category.id))) or 0
        rows = await self._category_rows(
            select(Category).order_by(Category.name).offset(offset).limit(page_size)
        )
        return CategoryListResponseDTO(
            items=[self._response(row) for row in rows],
            page=page,
            page_size=page_size,
            total=total,
        )

    async def get_category(self, category_id: int) -> CategoryResponseDTO:
        rows = await self._category_rows(select(Category).where(Category.id == category_id))
        if not rows:
            raise CategoryNotFoundError("Category not found.")
        return self._response(rows[0])

    async def create_category(
        self,
        request: CategoryCreateRequestDTO,
    ) -> CategoryResponseDTO:
        name = self._clean_name(request.name)
        description = self._clean_description(request.description)
        category = Category(
            name=name,
            description=description,
            slug=await self._generate_unique_slug(name),
        )
        self._session.add(category)
        await self._commit_or_duplicate()
        await self._session.refresh(category)
        return await self.get_category(category.id)

    async def replace_category(
        self,
        category_id: int,
        request: CategoryUpdateRequestDTO,
    ) -> CategoryResponseDTO:
        category = await self._get_model(category_id)
        category.name = self._clean_name(request.name)
        category.description = self._clean_description(request.description)
        await self._commit_or_duplicate()
        return await self.get_category(category.id)

    async def patch_category(
        self,
        category_id: int,
        request: CategoryPatchRequestDTO,
    ) -> CategoryResponseDTO:
        category = await self._get_model(category_id)
        if request.name is not None:
            category.name = self._clean_name(request.name)
        if "description" in request.model_fields_set:
            category.description = self._clean_description(request.description)
        await self._commit_or_duplicate()
        return await self.get_category(category.id)

    async def delete_category(self, category_id: int) -> None:
        category = await self._get_model(category_id)
        active_products = await self._session.scalar(
            select(func.count(Product.id)).where(
                Product.category_id == category.id,
                Product.is_available.is_(True),
                Product.stock > 0,
            )
        )
        seller_links = await self._session.scalar(
            select(func.count(seller_categories.c.category_id)).where(
                seller_categories.c.category_id == category.id
            )
        )
        if active_products or seller_links:
            raise CategoryDeleteBlockedError(
                "Category cannot be deleted while active products or seller associations exist."
            )

        await self._session.delete(category)
        await self._session.commit()

    async def _get_model(self, category_id: int) -> Category:
        category = await self._session.get(Category, category_id)
        if category is None:
            raise CategoryNotFoundError("Category not found.")
        return category

    async def _category_rows(self, statement) -> list[CategoryRow]:
        product_counts = (
            select(
                Product.category_id.label("category_id"),
                func.count(Product.id).label("product_count"),
            )
            .where(Product.is_available.is_(True), Product.stock > 0)
            .group_by(Product.category_id)
            .subquery()
        )
        result = await self._session.execute(
            statement.add_columns(func.coalesce(product_counts.c.product_count, 0))
            .outerjoin(product_counts, product_counts.c.category_id == Category.id)
        )
        return [
            CategoryRow(category=category, product_count=int(product_count))
            for category, product_count in result.all()
        ]

    async def _generate_unique_slug(self, name: str) -> str:
        base_slug = slugify(name, max_length=200).strip("-") or "category"
        slug = base_slug
        counter = 1
        while True:
            existing = await self._session.scalar(
                select(Category.id).where(Category.slug == slug)
            )
            if existing is None:
                return slug
            slug = f"{base_slug}-{counter}"
            counter += 1

    async def _commit_or_duplicate(self) -> None:
        try:
            await self._session.commit()
        except IntegrityError as exc:
            await self._session.rollback()
            raise CategoryAlreadyExistsError(
                "Category with this name or slug already exists."
            ) from exc

    def _clean_name(self, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise InvalidCategoryFieldError("name", "Name is required.")
        if len(cleaned) > 200:
            raise InvalidCategoryFieldError("name", "Must be at most 200 characters.")
        return cleaned

    def _clean_description(self, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        if len(cleaned) > 5000:
            raise InvalidCategoryFieldError(
                "description",
                "Must be at most 5000 characters.",
            )
        return cleaned or None

    def _response(self, row: CategoryRow) -> CategoryResponseDTO:
        category = row.category
        return CategoryResponseDTO(
            id=category.id,
            name=category.name,
            description=category.description,
            slug=category.slug,
            product_count=row.product_count,
            created_at=category.created_at,
            updated_at=category.updated_at,
        )
