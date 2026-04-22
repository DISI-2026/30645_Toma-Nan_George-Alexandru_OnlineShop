from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from application.usecases.notifications import NotificationService
from application.dtos.orders import (
    OrderBuyerSummaryDTO,
    OrderDetailsResponseDTO,
    OrderItemDTO,
    OrderStatusHistoryDTO,
    SellerOrderListItemDTO,
    SellerOrderListResponseDTO,
    UpdateOrderStatusRequestDTO,
    UpdateOrderStatusResponseDTO,
)
from models import Buyer, Order, OrderStatus, OrderStatusHistory, Seller


class OrderNotFoundError(Exception):
    pass


class OrderAccessDeniedError(Exception):
    pass


class InvalidOrderStatusTransitionError(Exception):
    pass


class BuyerProfileNotFoundError(Exception):
    pass


@dataclass(frozen=True, slots=True)
class ActorContext:
    profile_id: int
    role: str


class ListSellerOrdersUseCase:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def execute(
        self,
        user_id: int,
        status: OrderStatus | None,
        page: int,
        page_size: int,
    ) -> SellerOrderListResponseDTO:
        seller = await self._get_seller(user_id)
        filters = [Order.seller_id == seller.id]
        if status is not None:
            filters.append(Order.status == status)

        total_statement = select(func.count(Order.id)).where(*filters)
        total = (await self._session.execute(total_statement)).scalar_one()

        statement = (
            select(Order)
            .where(*filters)
            .options(
                selectinload(Order.items),
                selectinload(Order.buyer).selectinload(Buyer.user),
            )
            .order_by(Order.placed_at.desc(), Order.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        orders = list((await self._session.execute(statement)).scalars())

        return SellerOrderListResponseDTO(
            items=[self._to_list_item(order) for order in orders],
            page=page,
            page_size=page_size,
            total=total,
        )

    async def _get_seller(self, user_id: int) -> Seller:
        statement = select(Seller).where(Seller.user_id == user_id)
        seller = (await self._session.execute(statement)).scalar_one_or_none()
        if seller is None:
            raise OrderAccessDeniedError("Seller profile not found.")
        return seller

    def _to_list_item(self, order: Order) -> SellerOrderListItemDTO:
        return SellerOrderListItemDTO(
            id=order.id,
            order_number=order.order_number,
            buyer=self._to_buyer_summary(order.buyer),
            items=[OrderItemDTO.model_validate(item) for item in order.items],
            total=order.total,
            status=order.status,
            placed_at=order.placed_at,
        )

    def _to_buyer_summary(self, buyer: Buyer) -> OrderBuyerSummaryDTO:
        return OrderBuyerSummaryDTO(
            id=buyer.id,
            email=buyer.user.email,
            full_name=buyer.full_name,
        )


class GetOrderDetailsUseCase:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def execute(self, user_id: int, role: str, order_id: int) -> OrderDetailsResponseDTO:
        order = await self._get_order(order_id)
        actor = await self._resolve_actor(user_id, role)
        self._assert_can_access(order, actor)
        return self._to_details(order)

    async def _get_order(self, order_id: int) -> Order:
        statement = (
            select(Order)
            .where(Order.id == order_id)
            .options(
                selectinload(Order.items),
                selectinload(Order.status_history),
                selectinload(Order.buyer).selectinload(Buyer.user),
                selectinload(Order.seller).selectinload(Seller.user),
            )
        )
        order = (await self._session.execute(statement)).scalar_one_or_none()
        if order is None:
            raise OrderNotFoundError("Order not found.")
        return order

    async def _resolve_actor(self, user_id: int, role: str) -> ActorContext:
        if role == "seller":
            statement = select(Seller.id).where(Seller.user_id == user_id)
            seller_id = (await self._session.execute(statement)).scalar_one_or_none()
            if seller_id is None:
                raise OrderAccessDeniedError("Seller profile not found.")
            return ActorContext(profile_id=seller_id, role=role)

        if role == "buyer":
            statement = select(Buyer.id).where(Buyer.user_id == user_id)
            buyer_id = (await self._session.execute(statement)).scalar_one_or_none()
            if buyer_id is None:
                raise BuyerProfileNotFoundError("Buyer profile not found.")
            return ActorContext(profile_id=buyer_id, role=role)

        raise OrderAccessDeniedError("Only buyers and sellers can access orders.")

    def _assert_can_access(self, order: Order, actor: ActorContext) -> None:
        if actor.role == "seller" and order.seller_id != actor.profile_id:
            raise OrderAccessDeniedError("You can only access your own orders.")
        if actor.role == "buyer" and order.buyer_id != actor.profile_id:
            raise OrderAccessDeniedError("You can only access your own orders.")

    def _to_details(self, order: Order) -> OrderDetailsResponseDTO:
        return OrderDetailsResponseDTO(
            id=order.id,
            order_number=order.order_number,
            buyer=OrderBuyerSummaryDTO(
                id=order.buyer.id,
                email=order.buyer.user.email,
                full_name=order.buyer.full_name,
            ),
            seller_id=order.seller_id,
            delivery_address=order.delivery_address,
            notes=order.notes,
            items=[OrderItemDTO.model_validate(item) for item in order.items],
            total=order.total,
            status=order.status,
            placed_at=order.placed_at,
            updated_at=order.updated_at,
            status_history=[
                OrderStatusHistoryDTO.model_validate(history)
                for history in order.status_history
            ],
        )


class UpdateOrderStatusUseCase(GetOrderDetailsUseCase):
    async def execute(
        self,
        user_id: int,
        role: str,
        order_id: int,
        request: UpdateOrderStatusRequestDTO,
    ) -> UpdateOrderStatusResponseDTO:
        order = await self._get_order(order_id)
        actor = await self._resolve_actor(user_id, role)
        self._assert_can_access(order, actor)

        valid_next_transitions = self._valid_next_transitions(order.status, actor.role)
        if request.status not in valid_next_transitions:
            allowed = ", ".join(status.value for status in valid_next_transitions) or "none"
            raise InvalidOrderStatusTransitionError(
                f"Invalid transition from '{order.status.value}' to '{request.status.value}'. Allowed: {allowed}."
            )

        order.status = request.status
        order.status_history.append(
            OrderStatusHistory(
                status=request.status,
                changed_by_role=actor.role,
            )
        )
        self._create_status_notification(order, actor.role, request.status)

        await self._session.commit()
        await self._session.refresh(order)

        return UpdateOrderStatusResponseDTO(
            id=order.id,
            status=order.status,
            valid_next_transitions=self._valid_next_transitions(order.status, actor.role),
        )

    def _valid_next_transitions(
        self,
        current_status: OrderStatus,
        actor_role: str,
    ) -> list[OrderStatus]:
        if current_status in {OrderStatus.DELIVERED, OrderStatus.CANCELLED}:
            return []

        if actor_role == "buyer":
            return [OrderStatus.CANCELLED] if current_status == OrderStatus.PLACED else []

        if actor_role != "seller":
            return []

        transitions = {
            OrderStatus.PLACED: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
            OrderStatus.CONFIRMED: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
            OrderStatus.SHIPPED: [OrderStatus.DELIVERED],
        }
        return transitions.get(current_status, [])

    def _create_status_notification(
        self,
        order: Order,
        actor_role: str,
        next_status: OrderStatus,
    ) -> None:
        service = NotificationService(self._session)

        if next_status == OrderStatus.CANCELLED:
            if actor_role == "buyer":
                service.create_order_cancelled_by_buyer_notification(
                    order.seller.user_id,
                    order_id=order.id,
                    order_number=order.order_number,
                )
            elif actor_role == "seller":
                service.create_order_cancelled_by_seller_notification(
                    order.buyer.user_id,
                    order_id=order.id,
                    order_number=order.order_number,
                )
            return

        if actor_role == "seller":
            service.create_order_status_changed_notification(
                order.buyer.user_id,
                order_id=order.id,
                order_number=order.order_number,
                status=next_status.value,
            )
