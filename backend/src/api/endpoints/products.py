from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Body, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.dependencies.auth import AuthContext, require_roles
from api.dependencies.db import get_db_session
from api.exception_handler import handle_route_exceptions
from application.dtos.products import (
    UpdateProductRequestDTO,
    UpdateProductResponseDTO,
)
from application.usecases.products import UpdateProductUseCase
from models import Seller

router = APIRouter(prefix="/sellers/me/products", tags=["products"])


@router.patch("/{product_id}", response_model=UpdateProductResponseDTO)
@handle_route_exceptions()
async def update_product(
    product_id: int,
    auth_context: Annotated[AuthContext, Depends(require_roles("seller"))],
    session: Annotated[AsyncSession, Depends(get_db_session)],
    request: UpdateProductRequestDTO = Body(...),
) -> UpdateProductResponseDTO:
    use_case = UpdateProductUseCase(session)
    
    seller_result = await session.execute(
        select(Seller).where(Seller.user_id == auth_context.user_id)
    )
    seller = seller_result.scalar_one_or_none()
    if seller is None:
        raise ValueError("Seller profile not found.")
    
    return await use_case.execute(seller.id, product_id, request)
