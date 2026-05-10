from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Body, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from api.dependencies.auth import AuthContext, require_roles
from api.dependencies.db import get_db_session
from api.dependencies.seller import get_current_seller
from api.exception_handler import handle_route_exceptions
from application.dtos.reviews import (
    CreateReviewRequestDTO,
    ReplyToReviewRequestDTO,
    ReviewResponseDTO,
)
from application.usecases.reviews import ReplyToReviewUseCase
from application.usecases.reviews.reply_to_review_usecase import (
    CreateReviewUseCase as CreateReviewBySlugUseCase,
)
from models import Seller

router = APIRouter(tags=["reviews"])


@router.post("/products/{product_slug}/reviews", response_model=ReviewResponseDTO)
@handle_route_exceptions()
async def create_review(
    product_slug: str,
    auth_context: Annotated[AuthContext, Depends(require_roles("buyer"))],
    session: Annotated[AsyncSession, Depends(get_db_session)],
    request: CreateReviewRequestDTO = Body(...),
) -> ReviewResponseDTO:
    use_case = CreateReviewBySlugUseCase(session)
    review = await use_case.execute(auth_context.user_id, product_slug, request)
    return ReviewResponseDTO.from_review(review)


@router.post("/reviews/{review_id}/reply", response_model=ReviewResponseDTO)
@handle_route_exceptions()
async def reply_to_review(
    review_id: int,
    seller: Annotated[Seller, Depends(get_current_seller)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
    request: ReplyToReviewRequestDTO = Body(...),
) -> ReviewResponseDTO:
    use_case = ReplyToReviewUseCase(session)
    review = await use_case.execute(seller.id, review_id, request)
    return ReviewResponseDTO.from_review(review)
