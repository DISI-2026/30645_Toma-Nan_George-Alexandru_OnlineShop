from __future__ import annotations

from slugify import slugify
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from application.dtos.products import CreateProductRequestDTO
from models import Category, Product, Seller
from models.seller_category import seller_categories
from .update_product_usecase import CategoryNotFoundError


class SellerCategoryMismatchError(Exception):
    pass


class DuplicateSlugError(Exception):
    pass


class InvalidFieldError(Exception):
    def __init__(self, field: str, message: str):
        self.field = field
        self.message = message
        super().__init__(f"{field}: {message}")


class CreateProductUseCase:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def execute(
        self,
        seller_id: int,
        request: CreateProductRequestDTO,
    ) -> Product:
        await self._validate_category(request.category_id)
        await self._validate_seller_category(seller_id, request.category_id)
        self._validate_title(request.title)
        self._validate_description(request.description)
        self._validate_price(request.price)
        self._validate_stock(request.stock)

        slug = await self._generate_unique_slug(request.title)

        product = Product(
            seller_id=seller_id,
            category_id=request.category_id,
            title=request.title.strip(),
            slug=slug,
            description=self._clean_optional(request.description),
            price=request.price,
            stock=request.stock,
            is_available=True,
        )

        self._session.add(product)
        
        try:
            await self._session.commit()
        except IntegrityError as exc:
            await self._session.rollback()
            if "slug" in str(exc).lower():
                raise DuplicateSlugError("A product with this title already exists.") from exc
            raise
        
        await self._session.refresh(product)
        return product

    async def _validate_category(self, category_id: int) -> None:
        category = await self._session.get(Category, category_id)
        if category is None:
            raise CategoryNotFoundError("Category not found.")

    async def _validate_seller_category(self, seller_id: int, category_id: int) -> None:
        result = await self._session.execute(
            select(seller_categories).where(
                seller_categories.c.seller_id == seller_id,
                seller_categories.c.category_id == category_id,
            )
        )
        if result.first() is None:
            raise SellerCategoryMismatchError(
                "Seller can only create products in their assigned categories."
            )

    def _validate_title(self, title: str) -> None:
        value = title.strip()
        if len(value) < 3 or len(value) > 200:
            raise InvalidFieldError("title", "Must be between 3 and 200 characters.")

    def _validate_description(self, description: str) -> None:
        value = description.strip()
        if len(value) < 10 or len(value) > 5000:
            raise InvalidFieldError("description", "Must be between 10 and 5000 characters.")

    def _validate_price(self, price) -> None:
        if price <= 0:
            raise InvalidFieldError("price", "Price must be greater than 0.")

    def _validate_stock(self, stock: int) -> None:
        if stock < 0:
            raise InvalidFieldError("stock", "Stock must be non-negative.")

    def _clean_optional(self, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None

    async def _generate_unique_slug(self, title: str) -> str:
        base_slug = slugify(title, max_length=200)
        slug = base_slug
        counter = 1

        while True:
            result = await self._session.execute(
                select(Product).where(Product.slug == slug)
            )
            if result.scalar_one_or_none() is None:
                return slug
            
            slug = f"{base_slug}-{counter}"
            counter += 1
            
            if counter > 100:
                raise DuplicateSlugError("Unable to generate unique slug after 100 attempts.")
