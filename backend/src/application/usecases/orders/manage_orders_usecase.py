from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from application.dtos.orders import (
    BuyerOrderListItemDTO,
    BuyerOrderListPaginationDTO,
    BuyerOrderListResponseDTO,
    CheckoutOrderDTO,
    OrderBuyerDetailsDTO,
    OrderBuyerSummaryDTO,
    OrderDetailsResponseDTO,
    OrderItemDTO,
    OrderSellerDetailsDTO,
    OrderSellerSummaryDTO,
    OrderTrackingStatusResponseDTO,
    OrderStatusHistoryDTO,
    PlaceOrderRequestDTO,
    PlaceOrderResponseDTO,
    SellerOrderListItemDTO,
    SellerOrderListResponseDTO,
    UpdateOrderStatusRequestDTO,
    UpdateOrderStatusResponseDTO,
)
from application.services.neo4j_service import Neo4jService
from application.usecases.notifications import NotificationService
from models import (
    Buyer,
    CartItem,
    Order,
    OrderItem,
    OrderStatus,
    OrderStatusHistory,
    Seller,
)


class OrderNotFoundError(Exception):
    pass


class OrderAccessDeniedError(Exception):
    pass


class InvalidOrderStatusTransitionError(Exception):
    pass


class BuyerProfileNotFoundError(Exception):
    pass


class CartEmptyError(Exception):
    pass


class InsufficientStockError(Exception):
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


class ListBuyerOrdersUseCase:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def execute(
        self,
        user_id: int,
        status: OrderStatus | None,
        page: int,
        page_size: int,
    ) -> BuyerOrderListResponseDTO:
        buyer_id = await self._get_buyer_id(user_id)
        filters = [Order.buyer_id == buyer_id]
        if status is not None:
            filters.append(Order.status == status)

        total_statement = select(func.count(Order.id)).where(*filters)
        total_items = (await self._session.execute(total_statement)).scalar_one()

        statement = (
            select(
                Order.id,
                Order.order_number,
                Order.status,
                Order.total,
                Order.placed_at,
                Order.updated_at,
                Seller.id.label("seller_id"),
                Seller.company_name.label("seller_company_name"),
                func.coalesce(func.sum(OrderItem.quantity), 0).label("item_count"),
            )
            .join(Seller, Seller.id == Order.seller_id)
            .outerjoin(OrderItem, OrderItem.order_id == Order.id)
            .where(*filters)
            .group_by(Order.id, Seller.id)
            .order_by(Order.placed_at.desc(), Order.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        rows = (await self._session.execute(statement)).all()
        total_pages = (total_items + page_size - 1) // page_size if total_items else 0

        return BuyerOrderListResponseDTO(
            data=[
                BuyerOrderListItemDTO(
                    id=row.id,
                    order_number=row.order_number,
                    status=row.status,
                    seller=OrderSellerSummaryDTO(
                        id=row.seller_id,
                        company_name=row.seller_company_name,
                    ),
                    total=row.total,
                    item_count=row.item_count,
                    placed_at=row.placed_at,
                    updated_at=row.updated_at,
                )
                for row in rows
            ],
            pagination=BuyerOrderListPaginationDTO(
                page=page,
                page_size=page_size,
                total_items=total_items,
                total_pages=total_pages,
            ),
        )

    async def _get_buyer_id(self, user_id: int) -> int:
        statement = select(Buyer.id).where(Buyer.user_id == user_id)
        buyer_id = (await self._session.execute(statement)).scalar_one_or_none()
        if buyer_id is None:
            raise BuyerProfileNotFoundError("Buyer profile not found.")
        return buyer_id


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
            buyer=OrderBuyerDetailsDTO(
                id=order.buyer.id,
                email=order.buyer.user.email,
                full_name=order.buyer.full_name,
                phone=order.buyer.phone,
                address=order.buyer.address,
            ),
            seller=OrderSellerDetailsDTO(
                id=order.seller.id,
                company_name=order.seller.company_name,
                email=order.seller.user.email,
                phone=order.seller.phone,
                address=order.seller.address,
                tax_id=order.seller.tax_id,
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
        new_status: OrderStatus,
    ) -> None:
        service = NotificationService(self._session)
        if new_status == OrderStatus.CANCELLED:
            if actor_role == "buyer":
                service.create_order_cancelled_by_buyer_notification(
                    order.seller.user_id,
                    order_id=order.id,
                    order_number=order.order_number,
                )
                return
            if actor_role == "seller":
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
                status=new_status.value,
            )


class PlaceOrdersUseCase:
    def __init__(
        self,
        session: AsyncSession,
        neo4j_service: Neo4jService | None = None,
    ) -> None:
        self._session = session
        self._neo4j_service = neo4j_service

    async def execute(self, user_id: int, request: PlaceOrderRequestDTO) -> PlaceOrderResponseDTO:
        buyer_id = await self._get_buyer_id(user_id)
        cart_items = await self._get_cart_items(buyer_id)
        if not cart_items:
            raise CartEmptyError("Cart is empty.")

        grouped_items: dict[int, list[CartItem]] = {}
        for cart_item in cart_items:
            product = cart_item.product
            if cart_item.quantity > product.stock:
                raise InsufficientStockError(
                    f"Insufficient stock for product '{product.title}'."
                )
            grouped_items.setdefault(product.seller_id, []).append(cart_item)

        created_order_ids: list[int] = []
        notification_service = NotificationService(self._session)
        for seller_id in sorted(grouped_items):
            seller_items = grouped_items[seller_id]
            order = Order(
                order_number="PENDING",
                buyer_id=buyer_id,
                seller_id=seller_id,
                status=OrderStatus.PLACED,
                delivery_address={"address": request.delivery_address.strip()},
                notes=self._clean_optional(request.notes),
                total=self._compute_total(seller_items),
            )
            self._session.add(order)
            await self._session.flush()

            order.order_number = self._generate_order_number(order.id)
            seller_user_id = await self._get_seller_user_id(seller_id)
            notification_service.create_new_order_notification(
                seller_user_id,
                order_id=order.id,
                order_number=order.order_number,
            )
            self._session.add(
                OrderStatusHistory(
                    order_id=order.id,
                    status=OrderStatus.PLACED,
                    changed_by_role="buyer",
                )
            )

            for cart_item in seller_items:
                product = cart_item.product
                subtotal = product.price * cart_item.quantity
                self._session.add(
                    OrderItem(
                        order_id=order.id,
                        product_id=product.id,
                        product_title=product.title,
                        quantity=cart_item.quantity,
                        unit_price=product.price,
                        subtotal=subtotal,
                    )
                )
                product.stock -= cart_item.quantity

            created_order_ids.append(order.id)

        await self._session.execute(delete(CartItem).where(CartItem.cart_session_id == buyer_id))
        await self._session.commit()

        statement = (
            select(Order)
            .where(Order.id.in_(created_order_ids))
            .options(selectinload(Order.items))
            .order_by(Order.id.asc())
        )
        persisted_orders = list((await self._session.execute(statement)).scalars())

        if self._neo4j_service is not None:
            for persisted_order in persisted_orders:
                await self._neo4j_service.insert_order(persisted_order)

        return PlaceOrderResponseDTO(
            orders=[self._to_checkout_order(order) for order in persisted_orders],
            order_count=len(persisted_orders),
        )

    async def _get_buyer_id(self, user_id: int) -> int:
        statement = select(Buyer.id).where(Buyer.user_id == user_id)
        buyer_id = (await self._session.execute(statement)).scalar_one_or_none()
        if buyer_id is None:
            raise BuyerProfileNotFoundError("Buyer profile not found.")
        return buyer_id

    async def _get_cart_items(self, buyer_id: int) -> list[CartItem]:
        statement = (
            select(CartItem)
            .where(CartItem.cart_session_id == buyer_id)
            .options(selectinload(CartItem.product))
            .order_by(CartItem.id.asc())
        )
        return list((await self._session.execute(statement)).scalars())

    async def _get_seller_user_id(self, seller_id: int) -> int:
        statement = select(Seller.user_id).where(Seller.id == seller_id)
        seller_user_id = (await self._session.execute(statement)).scalar_one_or_none()
        if seller_user_id is None:
            raise OrderAccessDeniedError("Seller profile not found.")
        return seller_user_id

    def _compute_total(self, cart_items: list[CartItem]) -> Decimal:
        total = Decimal("0.00")
        for cart_item in cart_items:
            total += cart_item.product.price * cart_item.quantity
        return total

    def _generate_order_number(self, order_id: int) -> str:
        year = datetime.now(timezone.utc).year
        return f"ORD-{year}-{order_id:06d}"

    def _clean_optional(self, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None

    def _to_checkout_order(self, order: Order) -> CheckoutOrderDTO:
        return CheckoutOrderDTO(
            id=order.id,
            order_number=order.order_number,
            seller_id=order.seller_id,
            items=[OrderItemDTO.model_validate(item) for item in order.items],
            total=order.total,
            status=order.status,
            placed_at=order.placed_at,
        )


class GetOrderTrackingStatusUseCase(GetOrderDetailsUseCase):
    async def execute(
        self,
        user_id: int,
        role: str,
        order_id: int,
    ) -> OrderTrackingStatusResponseDTO:
        order = await self._get_order(order_id)
        actor = await self._resolve_actor(user_id, role)
        self._assert_can_access(order, actor)

        return OrderTrackingStatusResponseDTO(
            id=order.id,
            status=order.status,
            status_history=[
                OrderStatusHistoryDTO.model_validate(history)
                for history in order.status_history
            ],
            last_updated=order.updated_at,
        )
