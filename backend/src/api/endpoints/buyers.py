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

    if "full_name" in request.model_fields_set:
        user.buyer.full_name = request.full_name
    if "phone" in request.model_fields_set:
        user.buyer.phone = request.phone
    if "address" in request.model_fields_set:
        user.buyer.address = request.address

    if "preferences" in request.model_fields_set and request.preferences is not None:
        if "favorite_categories" in request.preferences.model_fields_set:
            favorite_categories = request.preferences.favorite_categories or []
            category_ids = sorted(set(favorite_categories))
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
            user.buyer.preferred_categories = preferred_categories

        if (
            "price_range" in request.preferences.model_fields_set
            and request.preferences.price_range is not None
        ):
            if "min" in request.preferences.price_range.model_fields_set:
                user.buyer.preferred_price_min = request.preferences.price_range.min
            if "max" in request.preferences.price_range.model_fields_set:
                user.buyer.preferred_price_max = request.preferences.price_range.max

    await session.commit()
    updated_buyer = buyer_me_use_case.execute(user)
    if updated_buyer is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load buyer profile.",
        )
    return updated_buyer
