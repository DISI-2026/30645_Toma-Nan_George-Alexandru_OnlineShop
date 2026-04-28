from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from api.dependencies.db import get_db_session
from api.exception_handler import handle_route_exceptions
from application.dtos.products import GetProductResponseDTO
from application.usecases.products import GetProductBySlugUseCase

router = APIRouter(prefix="/products", tags=["products"])


@router.get("/{slug}", response_model=GetProductResponseDTO)
@handle_route_exceptions()
async def get_product_by_slug(
    slug: str,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> GetProductResponseDTO:
    use_case = GetProductBySlugUseCase(session)
    return await use_case.execute(slug)
