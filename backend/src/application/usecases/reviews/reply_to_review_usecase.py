from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from application.dtos.reviews import CreateReviewRequestDTO, ReplyToReviewRequestDTO
from application.usecases.notifications import NotificationService
from models import Buyer, Order, OrderItem, OrderStatus, Product, Review, Seller


class ReviewNotFoundError(Exception):
    pass


class ReviewNotOwnedBySellerError(Exception):
    pass


class ReviewReplyAlreadyExistsError(Exception):
    pass


class ReviewAlreadyExistsError(Exception):
    pass


class ReviewEligibilityError(Exception):
    pass


class ReplyToReviewUseCase:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def execute(
        self,
        seller_id: int,
        review_id: int,
        request: ReplyToReviewRequestDTO,
    ) -> Review:
        review = await self._get_review_for_update(review_id)

        if review.product.seller_id != seller_id:
            raise ReviewNotOwnedBySellerError(
                "You can only reply to reviews for your own products."
            )

        if review.seller_reply is not None or review.reply_date is not None:
            raise ReviewReplyAlreadyExistsError("Review already has a seller reply.")

        review.seller_reply = request.comment
        review.reply_date = datetime.now(UTC)
        NotificationService(self._session).create_review_reply_notification(
            review.user_id,
            review_id=review.id,
            product_id=review.product_id,
            product_title=review.product.title,
        )

        await self._session.commit()
        await self._session.refresh(review)
        return review

    async def _get_review_for_update(self, review_id: int) -> Review:
        result = await self._session.execute(
            select(Review)
            .join(Product, Product.id == Review.product_id)
            .where(Review.id == review_id)
            .options(selectinload(Review.product))
            .with_for_update()
        )
        review = result.scalar_one_or_none()
        if review is None:
            raise ReviewNotFoundError("Review not found.")
        return review


class CreateReviewUseCase:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def execute(
        self,
        user_id: int,
        product_slug: str,
        request: CreateReviewRequestDTO,
    ) -> Review:
        buyer = await self._get_buyer(user_id)
        product = await self._get_product(product_slug)
        await self._assert_can_review(buyer.id, product.id)
        await self._assert_not_already_reviewed(user_id, product.id)

        review = Review(
            user_id=user_id,
            product_id=product.id,
            rating=request.rating,
            comment=request.comment,
        )
        self._session.add(review)
        await self._session.flush()

        NotificationService(self._session).create_new_review_notification(
            product.seller.user_id,
            review_id=review.id,
            product_id=product.id,
            product_title=product.title,
        )

        await self._session.commit()
        await self._session.refresh(review)
        return review

    async def _get_buyer(self, user_id: int) -> Buyer:
        statement = select(Buyer).where(Buyer.user_id == user_id)
        buyer = (await self._session.execute(statement)).scalar_one_or_none()
        if buyer is None:
            raise ReviewEligibilityError("Buyer profile not found.")
        return buyer

    async def _get_product(self, product_slug: str) -> Product:
        statement = (
            select(Product)
            .where(Product.slug == product_slug)
            .options(selectinload(Product.seller).selectinload(Seller.user))
        )
        product = (await self._session.execute(statement)).scalar_one_or_none()
        if product is None:
            raise ReviewNotFoundError("Product not found.")
        return product

    async def _assert_can_review(self, buyer_id: int, product_id: int) -> None:
        statement = (
            select(Order.id)
            .join(OrderItem, OrderItem.order_id == Order.id)
            .where(
                Order.buyer_id == buyer_id,
                Order.status == OrderStatus.DELIVERED,
                OrderItem.product_id == product_id,
            )
            .limit(1)
        )
        order_id = (await self._session.execute(statement)).scalar_one_or_none()
        if order_id is None:
            raise ReviewEligibilityError(
                "You can only review delivered products that you purchased."
            )

    async def _assert_not_already_reviewed(self, user_id: int, product_id: int) -> None:
        statement = select(Review.id).where(
            Review.user_id == user_id,
            Review.product_id == product_id,
        )
        review_id = (await self._session.execute(statement)).scalar_one_or_none()
        if review_id is not None:
            raise ReviewAlreadyExistsError("You already reviewed this product.")
