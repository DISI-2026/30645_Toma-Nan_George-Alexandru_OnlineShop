from __future__ import annotations

import hashlib

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from application.dtos.reviews import (
    CreateReviewRequestDTO,
    CreateReviewResponseDTO,
    ReviewBuyerDTO,
)
from application.usecases.products import ProductNotFoundError
from models import Buyer, Order, OrderItem, OrderStatus, Product, Review, User


class ReviewBuyerProfileNotFoundError(Exception):
    pass


class ReviewEligibilityError(Exception):
    pass


class ReviewAlreadyExistsError(Exception):
    pass


class CreateReviewUseCase:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def execute(
        self,
        *,
        user_id: int,
        product_id: int,
        request: CreateReviewRequestDTO,
    ) -> CreateReviewResponseDTO:
        buyer = await self._get_buyer_with_user(user_id)
        await self._ensure_product_exists(product_id)
        await self._ensure_buyer_is_eligible(buyer_id=buyer.id, product_id=product_id)
        await self._ensure_not_already_reviewed(user_id=user_id, product_id=product_id)

        review = Review(
            user_id=user_id,
            product_id=product_id,
            rating=request.rating,
            comment=request.comment,
        )
        self._session.add(review)
        try:
            await self._session.commit()
        except IntegrityError as exc:
            await self._session.rollback()
            if self._is_unique_review_violation(exc):
                raise ReviewAlreadyExistsError("Buyer already reviewed this product.") from exc
            raise

        await self._session.refresh(review)
        return CreateReviewResponseDTO(
            id=review.id,
            rating=review.rating,
            comment=review.comment,
            buyer=ReviewBuyerDTO(
                id=buyer.id,
                full_name=buyer.full_name,
                avatar_url=self._build_gravatar_url(buyer.user.email),
            ),
            created_at=review.created_at,
            seller_reply=review.seller_reply,
        )

    async def _get_buyer_with_user(self, user_id: int) -> Buyer:
        statement = (
            select(Buyer)
            .where(Buyer.user_id == user_id)
            .options(selectinload(Buyer.user))
        )
        buyer = (await self._session.execute(statement)).scalar_one_or_none()
        if buyer is None or buyer.user is None:
            raise ReviewBuyerProfileNotFoundError("Buyer profile not found.")
        return buyer

    async def _ensure_product_exists(self, product_id: int) -> None:
        statement = select(Product.id).where(Product.id == product_id)
        product_id_result = (await self._session.execute(statement)).scalar_one_or_none()
        if product_id_result is None:
            raise ProductNotFoundError("Product not found.")

    async def _ensure_buyer_is_eligible(self, *, buyer_id: int, product_id: int) -> None:
        statement = (
            select(OrderItem.id)
            .join(Order, Order.id == OrderItem.order_id)
            .where(
                Order.buyer_id == buyer_id,
                OrderItem.product_id == product_id,
                Order.status == OrderStatus.DELIVERED,
            )
            .limit(1)
        )
        has_delivered_order = (await self._session.execute(statement)).scalar_one_or_none()
        if has_delivered_order is None:
            raise ReviewEligibilityError(
                "Buyer does not have a delivered order for this product."
            )

    async def _ensure_not_already_reviewed(self, *, user_id: int, product_id: int) -> None:
        statement = select(Review.id).where(
            Review.user_id == user_id,
            Review.product_id == product_id,
        )
        existing_review = (await self._session.execute(statement)).scalar_one_or_none()
        if existing_review is not None:
            raise ReviewAlreadyExistsError("Buyer already reviewed this product.")

    def _build_gravatar_url(self, email: str) -> str:
        normalized_email = email.strip().lower().encode("utf-8")
        digest = hashlib.md5(normalized_email).hexdigest()  # noqa: S324
        return f"https://www.gravatar.com/avatar/{digest}"

    def _is_unique_review_violation(self, exc: IntegrityError) -> bool:
        message = str(exc.orig).lower()
        return (
            "uq_reviews_user_product" in message
            or "unique constraint failed: reviews.user_id, reviews.product_id" in message
        )
