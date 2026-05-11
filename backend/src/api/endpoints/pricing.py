from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from api.dependencies.db import get_db_session
from api.dependencies.seller import get_current_seller
from api.exception_handler import handle_route_exceptions
from application.dtos.pricing import PriceSuggestionsResponseDTO
from application.usecases.pricing import GetPriceSuggestionsUseCase
from models import Seller

router = APIRouter(prefix="/pricing", tags=["pricing"])


@router.get("/suggestions", response_model=PriceSuggestionsResponseDTO)
@handle_route_exceptions()
async def get_price_suggestions(
    seller: Annotated[Seller, Depends(get_current_seller)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
    product_id: int | None = Query(None),
) -> PriceSuggestionsResponseDTO:
    use_case = GetPriceSuggestionsUseCase(session)
    return await use_case.execute(seller.id, product_id)
