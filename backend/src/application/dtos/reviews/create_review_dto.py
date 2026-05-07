from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class CreateReviewRequestDTO(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str | None = Field(default=None, max_length=2000)


class ReviewBuyerDTO(BaseModel):
    id: int
    full_name: str | None
    avatar_url: str


class CreateReviewResponseDTO(BaseModel):
    id: int
    rating: int
    comment: str | None
    buyer: ReviewBuyerDTO
    created_at: datetime
    seller_reply: str | None
