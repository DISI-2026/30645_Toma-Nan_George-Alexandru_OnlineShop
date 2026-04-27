from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from api.dependencies.db import get_db_session
from api.exception_handler import handle_route_exceptions
from application.dtos.products import GetProductResponseDTO
from application.usecases.products import GetProductByIdUseCase

router = APIRouter(prefix="/products", tags=["products"])


@router.get("/{id}", response_model=GetProductResponseDTO)
@handle_route_exceptions()
async def get_product_by_id(
    id: int,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> GetProductResponseDTO:
    use_case = GetProductByIdUseCase(session)
    return await use_case.execute(id)
