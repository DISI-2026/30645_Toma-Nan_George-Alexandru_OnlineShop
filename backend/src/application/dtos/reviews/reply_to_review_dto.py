from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from models import Review


class ReplyToReviewRequestDTO(BaseModel):
    comment: str

    @field_validator("comment")
    @classmethod
    def validate_comment(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Reply comment must not be empty.")
        if len(cleaned) > 1000:
            raise ValueError("Reply comment must be at most 1000 characters.")
        return cleaned


class CreateReviewRequestDTO(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str | None = Field(default=None, max_length=2000)

    @field_validator("comment")
    @classmethod
    def clean_comment(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


class SellerReplyDTO(BaseModel):
    comment: str
    replied_at: datetime


class ReviewResponseDTO(BaseModel):
    id: int
    user_id: int
    product_id: int
    rating: int
    comment: str | None
    seller_reply: SellerReplyDTO | None
    created_at: datetime

    @classmethod
    def from_review(cls, review: Review) -> "ReviewResponseDTO":
        seller_reply = None
        if review.seller_reply is not None and review.reply_date is not None:
            seller_reply = SellerReplyDTO(
                comment=review.seller_reply,
                replied_at=review.reply_date,
            )

        return cls(
            id=review.id,
            user_id=review.user_id,
            product_id=review.product_id,
            rating=review.rating,
            comment=review.comment,
            seller_reply=seller_reply,
            created_at=review.created_at,
        )
