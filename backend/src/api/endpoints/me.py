from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from api.dependencies.auth import AuthContext, get_auth_context
from api.dependencies.db import get_db_session
from api.exception_handler import handle_route_exceptions
from application.dtos.auth.me_dto import BuyerMeDTO, MeResponseDTO, SellerMeDTO
from models import Buyer, User

router = APIRouter(tags=["auth"])


@router.get("/me", response_model=MeResponseDTO)
@handle_route_exceptions()
async def me(
    auth_context: AuthContext = Depends(get_auth_context),
    session: AsyncSession = Depends(get_db_session),
) -> MeResponseDTO:
    statement = (
        select(User)
        .where(User.id == auth_context.user_id)
        .options(
            selectinload(User.buyer).selectinload(Buyer.preferred_categories),
            selectinload(User.seller),
        )
    )
    user = (await session.execute(statement)).scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid access token.",
        )

    buyer: BuyerMeDTO | None = None
    if user.buyer is not None:
        buyer = BuyerMeDTO(
            address=user.buyer.address,
            preferred_category_ids=sorted(
                category.id for category in user.buyer.preferred_categories
            ),
        )

    seller: SellerMeDTO | None = None
    if user.seller is not None:
        seller = SellerMeDTO(
            company_name=user.seller.company_name,
            description=user.seller.description,
            logo_url=user.seller.logo_url,
        )

    return MeResponseDTO(
        id=user.id,
        email=user.email,
        role=user.role.value,
        buyer=buyer,
        seller=seller,
    )

