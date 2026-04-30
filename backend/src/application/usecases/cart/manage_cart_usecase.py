from __future__ import annotations

from decimal import Decimal

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from application.dtos.cart import (
    CartItemPayloadDTO,
    CartItemQuantityUpdateDTO,
    CartItemResponseDTO,
    CartResponseDTO,
)
from models import Buyer, CartItem, CartSession, Product


class CartBuyerProfileNotFoundError(Exception):
    pass


class CartProductNotFoundError(Exception):
    pass


class CartItemNotFoundError(Exception):
    pass


class CartQuantityExceedsStockError(Exception):
    pass


class GetCartUseCase:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def execute(self, user_id: int) -> CartResponseDTO:
        buyer_id = await self._get_buyer_id(user_id)
        await self._get_or_create_session(buyer_id)
        cart_items = await self._get_cart_items(buyer_id)
        return self._to_cart_response(cart_items)

    async def _get_buyer_id(self, user_id: int) -> int:
        statement = select(Buyer.id).where(Buyer.user_id == user_id)
        buyer_id = (await self._session.execute(statement)).scalar_one_or_none()
        if buyer_id is None:
            raise CartBuyerProfileNotFoundError("Buyer profile not found.")
        return buyer_id

    async def _get_or_create_session(self, buyer_id: int) -> CartSession:
        cart_session = await self._session.get(CartSession, buyer_id)
        if cart_session is not None:
            return cart_session

        cart_session = CartSession(buyer_id=buyer_id)
        self._session.add(cart_session)
        await self._session.flush()
        return cart_session

    async def _get_cart_items(self, buyer_id: int) -> list[CartItem]:
        statement = (
            select(CartItem)
            .where(CartItem.cart_session_id == buyer_id)
            .options(selectinload(CartItem.product))
            .order_by(CartItem.id.asc())
        )
        return list((await self._session.execute(statement)).scalars())

    def _to_cart_response(self, cart_items: list[CartItem]) -> CartResponseDTO:
        response_items: list[CartItemResponseDTO] = []
        total = Decimal("0.00")
        current_total = Decimal("0.00")
        price_changed = False

        for item in cart_items:
            current_price = item.product.price
            subtotal = item.unit_price * item.quantity
            current_subtotal = current_price * item.quantity
            total += subtotal
            current_total += current_subtotal
            if item.unit_price != current_price:
                price_changed = True

            response_items.append(
                CartItemResponseDTO(
                    id=item.id,
                    product_id=item.product_id,
                    product_title=item.product.title,
                    quantity=item.quantity,
                    unit_price=item.unit_price,
                    current_price=current_price,
                    subtotal=subtotal,
                )
            )

        return CartResponseDTO(
            items=response_items,
            total=total,
            current_total=current_total,
            price_changed=price_changed,
        )


class AddCartItemUseCase(GetCartUseCase):
    async def execute(self, user_id: int, request: CartItemPayloadDTO) -> CartResponseDTO:
        buyer_id = await self._get_buyer_id(user_id)
        await self._get_or_create_session(buyer_id)
        product = await self._get_product(request.product_id)
        cart_item = await self._get_cart_item_by_product(buyer_id, product.id)

        target_quantity = request.quantity
        if cart_item is not None:
            target_quantity = cart_item.quantity + request.quantity

        if target_quantity > product.stock:
            raise CartQuantityExceedsStockError("Requested quantity exceeds available stock.")

        if cart_item is None:
            self._session.add(
                CartItem(
                    cart_session_id=buyer_id,
                    product_id=product.id,
                    quantity=request.quantity,
                    unit_price=product.price,
                )
            )
        else:
            cart_item.quantity = target_quantity

        await self._session.commit()
        cart_items = await self._get_cart_items(buyer_id)
        return self._to_cart_response(cart_items)

    async def _get_product(self, product_id: int) -> Product:
        product = await self._session.get(Product, product_id)
        if product is None:
            raise CartProductNotFoundError("Product not found.")
        return product

    async def _get_cart_item_by_product(self, buyer_id: int, product_id: int) -> CartItem | None:
        statement = select(CartItem).where(
            CartItem.cart_session_id == buyer_id,
            CartItem.product_id == product_id,
        )
        return (await self._session.execute(statement)).scalar_one_or_none()


class UpdateCartItemQuantityUseCase(AddCartItemUseCase):
    async def execute(
        self,
        user_id: int,
        item_id: int,
        request: CartItemQuantityUpdateDTO,
    ) -> CartResponseDTO:
        buyer_id = await self._get_buyer_id(user_id)
        cart_item = await self._get_cart_item(buyer_id, item_id)
        product = await self._get_product(cart_item.product_id)

        if request.quantity > product.stock:
            raise CartQuantityExceedsStockError("Requested quantity exceeds available stock.")

        cart_item.quantity = request.quantity
        await self._session.commit()
        cart_items = await self._get_cart_items(buyer_id)
        return self._to_cart_response(cart_items)

    async def _get_cart_item(self, buyer_id: int, item_id: int) -> CartItem:
        statement = select(CartItem).where(
            CartItem.id == item_id,
            CartItem.cart_session_id == buyer_id,
        )
        cart_item = (await self._session.execute(statement)).scalar_one_or_none()
        if cart_item is None:
            raise CartItemNotFoundError("Cart item not found.")
        return cart_item


class RemoveCartItemUseCase(UpdateCartItemQuantityUseCase):
    async def execute(self, user_id: int, item_id: int) -> None:
        buyer_id = await self._get_buyer_id(user_id)
        cart_item = await self._get_cart_item(buyer_id, item_id)
        await self._session.delete(cart_item)
        await self._session.commit()


class ClearCartUseCase(GetCartUseCase):
    async def execute(self, user_id: int) -> None:
        buyer_id = await self._get_buyer_id(user_id)
        await self._session.execute(
            delete(CartItem).where(CartItem.cart_session_id == buyer_id)
        )
        await self._session.commit()
