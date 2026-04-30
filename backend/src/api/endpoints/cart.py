from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from api.dependencies.auth import AuthContext, require_roles
from api.dependencies.db import get_db_session
from api.exception_handler import handle_route_exceptions
from application.dtos.cart import (
    CartItemPayloadDTO,
    CartItemQuantityUpdateDTO,
    CartResponseDTO,
)
from application.usecases.cart import (
    AddCartItemUseCase,
    ClearCartUseCase,
    GetCartUseCase,
    RemoveCartItemUseCase,
    UpdateCartItemQuantityUseCase,
)

router = APIRouter(tags=["cart"])


@router.get("/cart", response_model=CartResponseDTO)
@handle_route_exceptions()
async def get_cart(
    auth_context: Annotated[AuthContext, Depends(require_roles("buyer"))],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> CartResponseDTO:
    use_case = GetCartUseCase(session)
    return await use_case.execute(auth_context.user_id)


@router.post("/cart/items", response_model=CartResponseDTO)
@handle_route_exceptions()
async def add_cart_item(
    request: CartItemPayloadDTO,
    auth_context: Annotated[AuthContext, Depends(require_roles("buyer"))],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> CartResponseDTO:
    use_case = AddCartItemUseCase(session)
    return await use_case.execute(auth_context.user_id, request)


@router.patch("/cart/items/{item_id}", response_model=CartResponseDTO)
@handle_route_exceptions()
async def update_cart_item_quantity(
    item_id: int,
    request: CartItemQuantityUpdateDTO,
    auth_context: Annotated[AuthContext, Depends(require_roles("buyer"))],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> CartResponseDTO:
    use_case = UpdateCartItemQuantityUseCase(session)
    return await use_case.execute(auth_context.user_id, item_id, request)


@router.delete("/cart/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
@handle_route_exceptions()
async def remove_cart_item(
    item_id: int,
    auth_context: Annotated[AuthContext, Depends(require_roles("buyer"))],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> Response:
    use_case = RemoveCartItemUseCase(session)
    await use_case.execute(auth_context.user_id, item_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/cart", status_code=status.HTTP_204_NO_CONTENT)
@handle_route_exceptions()
async def clear_cart(
    auth_context: Annotated[AuthContext, Depends(require_roles("buyer"))],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> Response:
    use_case = ClearCartUseCase(session)
    await use_case.execute(auth_context.user_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
