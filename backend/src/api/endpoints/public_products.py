from __future__ import annotations

from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from api.dependencies.auth import AuthContext, get_optional_auth_context, require_roles
from api.dependencies.db import get_db_session
from api.exception_handler import handle_route_exceptions
from application.dtos.products import GetProductResponseDTO, ListProductsQueryDTO, ListProductsResponseDTO
from application.dtos.reviews import CreateReviewRequestDTO, CreateReviewResponseDTO
from application.usecases.products import GetProductBySlugUseCase, ListProductsUseCase
from application.usecases.reviews import CreateReviewUseCase

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=ListProductsResponseDTO)
@handle_route_exceptions()
async def list_products(
    session: Annotated[AsyncSession, Depends(get_db_session)],
    auth_context: Annotated[AuthContext | None, Depends(get_optional_auth_context)],
    q: Annotated[str | None, Query()] = None,
    category_id: Annotated[int | None, Query(ge=1)] = None,
    seller_id: Annotated[int | None, Query(ge=1)] = None,
    min_price: Annotated[Decimal | None, Query(ge=0)] = None,
    max_price: Annotated[Decimal | None, Query(ge=0)] = None,
    min_rating: Annotated[Decimal | None, Query(ge=0, le=5)] = None,
    is_available: Annotated[bool, Query()] = True,
    sort: Annotated[str, Query(pattern="^(price_asc|price_desc|rating_desc|newest)$")] = "newest",
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> ListProductsResponseDTO:
    effective_is_available = True
    if auth_context is not None and auth_context.role not in {"buyer"}:
        effective_is_available = is_available

    use_case = ListProductsUseCase(session)
    return await use_case.execute(
        ListProductsQueryDTO(
            q=q,
            category_id=category_id,
            seller_id=seller_id,
            min_price=min_price,
            max_price=max_price,
            min_rating=min_rating,
            is_available=effective_is_available,
            sort=sort,
            page=page,
            page_size=page_size,
        )
    )


@router.get("/{slug}", response_model=GetProductResponseDTO)
@handle_route_exceptions()
async def get_product_by_slug(
    slug: str,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> GetProductResponseDTO:
    use_case = GetProductBySlugUseCase(session)
    return await use_case.execute(slug)


@router.post("/{id}/reviews", response_model=CreateReviewResponseDTO, status_code=status.HTTP_201_CREATED)
@handle_route_exceptions()
async def create_product_review(
    id: int,
    request: CreateReviewRequestDTO,
    auth_context: Annotated[AuthContext, Depends(require_roles("buyer"))],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> CreateReviewResponseDTO:
    use_case = CreateReviewUseCase(session)
    return await use_case.execute(
        user_id=auth_context.user_id,
        product_id=id,
        request=request,
    )
