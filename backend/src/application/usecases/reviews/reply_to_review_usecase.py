from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from application.dtos.reviews import ReplyToReviewRequestDTO
from models import Product, Review


class ReviewNotFoundError(Exception):
    pass


class ReviewNotOwnedBySellerError(Exception):
    pass


class ReviewReplyAlreadyExistsError(Exception):
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
