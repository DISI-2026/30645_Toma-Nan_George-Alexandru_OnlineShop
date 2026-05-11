from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Body, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from api.dependencies.auth import AuthContext, require_roles
from api.dependencies.db import get_db_session
from api.dependencies.neo4j import get_optional_neo4j_service
from api.exception_handler import handle_route_exceptions
from application.dtos.orders import (
    BuyerOrderListResponseDTO,
    OrderDetailsResponseDTO,
    OrderTrackingStatusResponseDTO,
    PlaceOrderRequestDTO,
    PlaceOrderResponseDTO,
    SellerOrderListResponseDTO,
    UpdateOrderStatusRequestDTO,
    UpdateOrderStatusResponseDTO,
)
from application.services.neo4j_service import Neo4jService
from application.usecases.orders import (
    GetOrderTrackingStatusUseCase,
    GetOrderDetailsUseCase,
    ListBuyerOrdersUseCase,
    ListSellerOrdersUseCase,
    PlaceOrdersUseCase,
    UpdateOrderStatusUseCase,
)
from models import OrderStatus

router = APIRouter(tags=["orders"])


@router.post("/orders", response_model=PlaceOrderResponseDTO)
@handle_route_exceptions()
async def place_order(
    auth_context: Annotated[AuthContext, Depends(require_roles("buyer"))],
    session: Annotated[AsyncSession, Depends(get_db_session)],
    neo4j_service: Annotated[Neo4jService | None, Depends(get_optional_neo4j_service)],
    request: PlaceOrderRequestDTO = Body(...),
) -> PlaceOrderResponseDTO:
    use_case = PlaceOrdersUseCase(session, neo4j_service)
    return await use_case.execute(auth_context.user_id, request)


@router.get("/orders", response_model=BuyerOrderListResponseDTO)
@handle_route_exceptions()
async def list_buyer_orders(
    auth_context: Annotated[AuthContext, Depends(require_roles("buyer"))],
    session: Annotated[AsyncSession, Depends(get_db_session)],
    status: Annotated[OrderStatus | None, Query()] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> BuyerOrderListResponseDTO:
    use_case = ListBuyerOrdersUseCase(session)
    return await use_case.execute(auth_context.user_id, status, page, page_size)


@router.get("/sellers/me/orders", response_model=SellerOrderListResponseDTO)
@handle_route_exceptions()
async def list_seller_orders(
    auth_context: Annotated[AuthContext, Depends(require_roles("seller"))],
    session: Annotated[AsyncSession, Depends(get_db_session)],
    status: Annotated[OrderStatus | None, Query()] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> SellerOrderListResponseDTO:
    use_case = ListSellerOrdersUseCase(session)
    return await use_case.execute(auth_context.user_id, status, page, page_size)


@router.get("/orders/{order_id}", response_model=OrderDetailsResponseDTO)
@handle_route_exceptions()
async def get_order_details(
    order_id: int,
    auth_context: Annotated[AuthContext, Depends(require_roles("seller", "buyer"))],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> OrderDetailsResponseDTO:
    use_case = GetOrderDetailsUseCase(session)
    return await use_case.execute(auth_context.user_id, auth_context.role, order_id)


@router.get("/orders/{order_id}/status", response_model=OrderTrackingStatusResponseDTO)
@handle_route_exceptions()
async def get_order_status(
    order_id: int,
    auth_context: Annotated[AuthContext, Depends(require_roles("seller", "buyer"))],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> OrderTrackingStatusResponseDTO:
    use_case = GetOrderTrackingStatusUseCase(session)
    return await use_case.execute(auth_context.user_id, auth_context.role, order_id)


@router.patch("/orders/{order_id}/status", response_model=UpdateOrderStatusResponseDTO)
@handle_route_exceptions()
async def update_order_status(
    order_id: int,
    auth_context: Annotated[AuthContext, Depends(require_roles("seller", "buyer"))],
    session: Annotated[AsyncSession, Depends(get_db_session)],
    request: UpdateOrderStatusRequestDTO = Body(...),
) -> UpdateOrderStatusResponseDTO:
    use_case = UpdateOrderStatusUseCase(session)
    return await use_case.execute(auth_context.user_id, auth_context.role, order_id, request)
