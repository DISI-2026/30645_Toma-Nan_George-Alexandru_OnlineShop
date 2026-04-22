from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from application.dtos.products import UpdateProductImagesRequestDTO
from models import Product, ProductImage

from .update_product_usecase import InvalidFieldError, ProductNotFoundError, ProductNotOwnedBySellerError


class UpdateProductImagesUseCase:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def execute(
        self,
        seller_id: int,
        product_id: int,
        request: UpdateProductImagesRequestDTO,
    ) -> Product:
        product = await self._get_product(product_id)

        if product.seller_id != seller_id:
            raise ProductNotOwnedBySellerError(
                "You can only update your own products."
            )

        self._validate_payload(product.images, request)

        submitted_images = sorted(request.images, key=lambda image: image.display_order)
        images_by_id = {image.id: image for image in product.images}

        for normalized_order, submitted_image in enumerate(submitted_images):
            image = images_by_id[submitted_image.id]
            image.display_order = normalized_order
            image.is_thumbnail = submitted_image.is_thumbnail

        await self._session.commit()

        refreshed_product = await self._get_product(product_id)
        refreshed_product.images.sort(key=lambda image: image.display_order)
        return refreshed_product

    async def _get_product(self, product_id: int) -> Product:
        result = await self._session.execute(
            select(Product)
            .where(Product.id == product_id)
            .options(selectinload(Product.images))
        )
        product = result.scalar_one_or_none()
        if product is None:
            raise ProductNotFoundError("Product not found.")

        product.images.sort(key=lambda image: image.display_order)
        return product

    def _validate_payload(
        self,
        existing_images: list[ProductImage],
        request: UpdateProductImagesRequestDTO,
    ) -> None:
        existing_ids = {image.id for image in existing_images}
        submitted_ids = [image.id for image in request.images]
        submitted_id_set = set(submitted_ids)

        if len(submitted_ids) != len(submitted_id_set):
            raise InvalidFieldError("images", "Duplicate image ids are not allowed.")

        if len(existing_ids) != len(submitted_ids):
            raise InvalidFieldError("images", "Payload must include the full image set for the product.")

        if submitted_id_set != existing_ids:
            raise InvalidFieldError("images", "All images must belong to the target product and be included exactly once.")

        display_orders = [image.display_order for image in request.images]
        if len(display_orders) != len(set(display_orders)):
            raise InvalidFieldError("images", "Duplicate display_order values are not allowed.")

        thumbnail_count = sum(1 for image in request.images if image.is_thumbnail)
        if thumbnail_count != 1:
            raise InvalidFieldError("images", "Exactly one image must be marked as thumbnail.")
