from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from application.dtos.products import UpdateProductRequestDTO, UpdateProductResponseDTO
from models import Category, Product


class ProductNotFoundError(Exception):
    pass


class ProductNotOwnedBySellerError(Exception):
    pass


class CategoryNotFoundError(Exception):
    pass


class InvalidFieldError(Exception):
    def __init__(self, field: str, message: str):
        self.field = field
        self.message = message
        super().__init__(f"{field}: {message}")


class UpdateProductUseCase:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def execute(
        self,
        seller_id: int,
        product_id: int,
        request: UpdateProductRequestDTO,
    ) -> UpdateProductResponseDTO:
        product = await self._get_product(product_id)
        
        if product.seller_id != seller_id:
            raise ProductNotOwnedBySellerError(
                "You can only update your own products."
            )

        if request.title is not None:
            self._validate_title(request.title)
            product.title = request.title.strip()

        if request.description is not None:
            product.description = self._clean_optional(request.description)

        if request.price is not None:
            self._validate_price(request.price)
            product.price = request.price

        if request.stock is not None:
            self._validate_stock(request.stock)
            product.stock = request.stock

        if request.is_available is not None:
            product.is_available = request.is_available

        if request.category_id is not None:
            await self._validate_category(request.category_id)
            product.category_id = request.category_id

        await self._session.commit()
        await self._session.refresh(product)

        return UpdateProductResponseDTO.model_validate(product)

    async def _get_product(self, product_id: int) -> Product:
        product = await self._session.get(Product, product_id)
        if product is None:
            raise ProductNotFoundError("Product not found.")
        return product

    async def _validate_category(self, category_id: int) -> None:
        category = await self._session.get(Category, category_id)
        if category is None:
            raise CategoryNotFoundError("Category not found.")

    def _validate_title(self, title: str) -> None:
        value = title.strip()
        if len(value) < 1 or len(value) > 255:
            raise InvalidFieldError("title", "Must be between 1 and 255 characters.")

    def _validate_price(self, price) -> None:
        if price < 0:
            raise InvalidFieldError("price", "Price must be non-negative.")

    def _validate_stock(self, stock: int) -> None:
        if stock < 0:
            raise InvalidFieldError("stock", "Stock must be non-negative.")

    def _clean_optional(self, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None
