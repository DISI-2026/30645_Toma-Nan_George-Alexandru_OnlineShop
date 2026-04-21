from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Body, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from api.dependencies.db import get_db_session
from api.dependencies.seller import get_current_seller
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
    seller: Annotated[Seller, Depends(get_current_seller)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
    request: UpdateProductRequestDTO = Body(...),
) -> UpdateProductResponseDTO:
    use_case = UpdateProductUseCase(session)
    return await use_case.execute(seller.id, product_id, request)
