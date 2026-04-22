from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from api.dependencies.auth import AuthContext, require_roles
from api.dependencies.db import get_db_session
from api.exception_handler import handle_route_exceptions
from application.dtos.auth.me_dto import BuyerMeDTO, UpdateBuyerProfileRequestDTO
from application.usecases.auth import (
    GetBuyerMeUseCase,
    InvalidBuyerPreferenceCategoriesError,
)
from models import Buyer, Category, User

router = APIRouter(prefix="/buyer", tags=["buyers"])


@router.patch("/me", response_model=BuyerMeDTO)
@handle_route_exceptions()
async def update_buyer_profile(
    request: UpdateBuyerProfileRequestDTO,
    auth_context: Annotated[AuthContext, Depends(require_roles("buyer"))],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> BuyerMeDTO:
    buyer_me_use_case = GetBuyerMeUseCase()
    statement = (
        select(User)
        .where(User.id == auth_context.user_id)
        .options(selectinload(User.buyer).selectinload(Buyer.preferred_categories))
    )
    user = (await session.execute(statement)).scalar_one_or_none()
    if user is None or user.buyer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Buyer profile not found.",
        )

    category_ids = sorted(set(request.preferences.favorite_categories))
    preferred_categories: list[Category] = []
    if category_ids:
        categories_statement = select(Category).where(Category.id.in_(category_ids))
        preferred_categories = list(
            (await session.execute(categories_statement)).scalars()
        )
        if len(preferred_categories) != len(category_ids):
            found_ids = {category.id for category in preferred_categories}
            missing_ids = [
                category_id
                for category_id in category_ids
                if category_id not in found_ids
            ]
            raise InvalidBuyerPreferenceCategoriesError(
                f"Invalid preferred categories: {missing_ids}."
            )

    user.buyer.full_name = request.full_name
    user.buyer.address = request.address
    user.buyer.preferred_price_min = request.preferences.price_range.min
    user.buyer.preferred_price_max = request.preferences.price_range.max
    user.buyer.preferred_categories = preferred_categories

    await session.commit()
    updated_buyer = buyer_me_use_case.execute(user)
    if updated_buyer is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load buyer profile.",
        )
    return updated_buyer
