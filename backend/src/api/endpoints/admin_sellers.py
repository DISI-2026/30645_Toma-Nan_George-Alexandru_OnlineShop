from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from api.dependencies.auth import require_roles
from api.dependencies.db import get_db_session
from api.exception_handler import handle_route_exceptions
from application.dtos.sellers import (
    AdminSellerListResponseDTO,
    AssignSellerCategoryRequestDTO,
    SellerCategoryAssignmentResponseDTO,
)
from application.usecases.sellers import ManageSellerCategoriesUseCase

router = APIRouter(
    prefix="/admin/sellers",
    tags=["admin-sellers"],
    dependencies=[Depends(require_roles("admin"))],
)


@router.get("", response_model=AdminSellerListResponseDTO)
@handle_route_exceptions()
async def list_sellers(
    session: Annotated[AsyncSession, Depends(get_db_session)],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    category_id: Annotated[int | None, Query(gt=0)] = None,
) -> AdminSellerListResponseDTO:
    use_case = ManageSellerCategoriesUseCase(session)
    return await use_case.list_sellers(page, page_size, category_id)


@router.post(
    "/{seller_id}/categories",
    response_model=SellerCategoryAssignmentResponseDTO,
    status_code=status.HTTP_201_CREATED,
)
@handle_route_exceptions()
async def assign_seller_category(
    seller_id: int,
    request: AssignSellerCategoryRequestDTO,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> SellerCategoryAssignmentResponseDTO:
    use_case = ManageSellerCategoriesUseCase(session)
    return await use_case.assign_category(seller_id, request.category_id)


@router.delete(
    "/{seller_id}/categories/{category_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
@handle_route_exceptions()
async def remove_seller_category(
    seller_id: int,
    category_id: int,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> Response:
    use_case = ManageSellerCategoriesUseCase(session)
    await use_case.remove_category(seller_id, category_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
