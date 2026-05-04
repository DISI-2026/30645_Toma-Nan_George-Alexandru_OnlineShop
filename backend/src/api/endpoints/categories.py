from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from api.dependencies.auth import require_roles
from api.dependencies.db import get_db_session
from api.exception_handler import handle_route_exceptions
from application.dtos.categories import (
    CategoryCreateRequestDTO,
    CategoryListResponseDTO,
    CategoryPatchRequestDTO,
    CategoryResponseDTO,
    CategoryUpdateRequestDTO,
)
from application.usecases.categories import ManageCategoriesUseCase

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=CategoryListResponseDTO)
@handle_route_exceptions()
async def list_categories(
    session: Annotated[AsyncSession, Depends(get_db_session)],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> CategoryListResponseDTO:
    use_case = ManageCategoriesUseCase(session)
    return await use_case.list_categories(page, page_size)


@router.get("/{category_id}", response_model=CategoryResponseDTO)
@handle_route_exceptions()
async def get_category(
    category_id: int,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> CategoryResponseDTO:
    use_case = ManageCategoriesUseCase(session)
    return await use_case.get_category(category_id)


@router.post(
    "",
    response_model=CategoryResponseDTO,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles("admin"))],
)
@handle_route_exceptions()
async def create_category(
    request: CategoryCreateRequestDTO,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> CategoryResponseDTO:
    use_case = ManageCategoriesUseCase(session)
    return await use_case.create_category(request)


@router.put(
    "/{category_id}",
    response_model=CategoryResponseDTO,
    dependencies=[Depends(require_roles("admin"))],
)
@handle_route_exceptions()
async def replace_category(
    category_id: int,
    request: CategoryUpdateRequestDTO,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> CategoryResponseDTO:
    use_case = ManageCategoriesUseCase(session)
    return await use_case.replace_category(category_id, request)


@router.patch(
    "/{category_id}",
    response_model=CategoryResponseDTO,
    dependencies=[Depends(require_roles("admin"))],
)
@handle_route_exceptions()
async def patch_category(
    category_id: int,
    request: CategoryPatchRequestDTO,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> CategoryResponseDTO:
    use_case = ManageCategoriesUseCase(session)
    return await use_case.patch_category(category_id, request)


@router.delete(
    "/{category_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_roles("admin"))],
)
@handle_route_exceptions()
async def delete_category(
    category_id: int,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> Response:
    use_case = ManageCategoriesUseCase(session)
    await use_case.delete_category(category_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
