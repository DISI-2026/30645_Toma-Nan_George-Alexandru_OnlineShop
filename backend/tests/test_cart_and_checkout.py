from __future__ import annotations

from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from api.dependencies.auth import ACCESS_TOKEN_COOKIE_NAME
from application.security import create_access_token, hash_password_pbkdf2
from models import Buyer, Category, Order, OrderStatusHistory, Product, Seller, User, UserRole


def auth_cookies(user_id: int, role: str) -> dict[str, str]:
    token = create_access_token(
        user_id=user_id,
        role=role,
        secret_key="test-secret",
        expires_in_minutes=60,
    )
    return {ACCESS_TOKEN_COOKIE_NAME: token}


async def seed_market(session_factory: async_sessionmaker) -> dict[str, int]:
    async with session_factory() as session:
        buyer_user = User(
            email="cart-buyer@example.com",
            password_hash=hash_password_pbkdf2("password123"),
            role=UserRole.BUYER,
        )
        seller_user_1 = User(
            email="cart-seller-1@example.com",
            password_hash=hash_password_pbkdf2("password123"),
            role=UserRole.SELLER,
        )
        seller_user_2 = User(
            email="cart-seller-2@example.com",
            password_hash=hash_password_pbkdf2("password123"),
            role=UserRole.SELLER,
        )
        seller_user_3 = User(
            email="cart-seller-3@example.com",
            password_hash=hash_password_pbkdf2("password123"),
            role=UserRole.SELLER,
        )
        session.add_all([buyer_user, seller_user_1, seller_user_2, seller_user_3])
        await session.flush()

        buyer = Buyer(user_id=buyer_user.id, full_name="Buyer Cart", address="Cluj")
        seller_1 = Seller(user_id=seller_user_1.id, company_name="Seller One")
        seller_2 = Seller(user_id=seller_user_2.id, company_name="Seller Two")
        seller_3 = Seller(user_id=seller_user_3.id, company_name="Seller Three")
        category = Category(name="Cart Category")
        session.add_all([buyer, seller_1, seller_2, seller_3, category])
        await session.flush()

        product_1 = Product(
            seller_id=seller_1.id,
            category_id=category.id,
            title="Laptop Cart",
            description="Laptop for cart tests",
            price=Decimal("100.00"),
            stock=5,
            is_available=True,
        )
        product_2 = Product(
            seller_id=seller_2.id,
            category_id=category.id,
            title="Phone Cart",
            description="Phone for cart tests",
            price=Decimal("50.00"),
            stock=4,
            is_available=True,
        )
        session.add_all([product_1, product_2])
        await session.commit()

        return {
            "buyer_user_id": buyer_user.id,
            "seller_user_id_1": seller_user_1.id,
            "seller_user_id_2": seller_user_2.id,
            "seller_user_id_3": seller_user_3.id,
            "product_1_id": product_1.id,
            "product_2_id": product_2.id,
            "seller_1_id": seller_1.id,
            "seller_2_id": seller_2.id,
            "buyer_id": buyer.id,
        }


@pytest.mark.asyncio
async def test_cart_endpoints_crud_flow(client: AsyncClient, session_factory):
    ids = await seed_market(session_factory)
    cookies = auth_cookies(ids["buyer_user_id"], "buyer")

    add_response = await client.post(
        "/api/v1/cart/items",
        cookies=cookies,
        json={"product_id": ids["product_1_id"], "quantity": 1},
    )
    assert add_response.status_code == 200
    payload = add_response.json()
    assert payload["price_changed"] is False
    assert payload["total"] == "100.00"
    item_id = payload["items"][0]["id"]

    increment_response = await client.post(
        "/api/v1/cart/items",
        cookies=cookies,
        json={"product_id": ids["product_1_id"], "quantity": 2},
    )
    assert increment_response.status_code == 200
    assert increment_response.json()["items"][0]["quantity"] == 3

    update_response = await client.patch(
        f"/api/v1/cart/items/{item_id}",
        cookies=cookies,
        json={"quantity": 2},
    )
    assert update_response.status_code == 200
    assert update_response.json()["items"][0]["quantity"] == 2

    delete_response = await client.delete(f"/api/v1/cart/items/{item_id}", cookies=cookies)
    assert delete_response.status_code == 204

    get_after_delete = await client.get("/api/v1/cart", cookies=cookies)
    assert get_after_delete.status_code == 200
    assert get_after_delete.json()["items"] == []

    await client.post(
        "/api/v1/cart/items",
        cookies=cookies,
        json={"product_id": ids["product_1_id"], "quantity": 1},
    )
    await client.post(
        "/api/v1/cart/items",
        cookies=cookies,
        json={"product_id": ids["product_2_id"], "quantity": 1},
    )

    clear_response = await client.delete("/api/v1/cart", cookies=cookies)
    assert clear_response.status_code == 204
    get_after_clear = await client.get("/api/v1/cart", cookies=cookies)
    assert get_after_clear.status_code == 200
    assert get_after_clear.json()["items"] == []


@pytest.mark.asyncio
async def test_cart_price_changed_flag_when_product_price_changes(client: AsyncClient, session_factory):
    ids = await seed_market(session_factory)
    cookies = auth_cookies(ids["buyer_user_id"], "buyer")

    add_response = await client.post(
        "/api/v1/cart/items",
        cookies=cookies,
        json={"product_id": ids["product_1_id"], "quantity": 1},
    )
    assert add_response.status_code == 200

    async with session_factory() as session:
        product = await session.get(Product, ids["product_1_id"])
        assert product is not None
        product.price = Decimal("120.00")
        await session.commit()

    cart_response = await client.get("/api/v1/cart", cookies=cookies)
    assert cart_response.status_code == 200
    payload = cart_response.json()
    assert payload["price_changed"] is True
    assert payload["total"] == "100.00"
    assert payload["current_total"] == "120.00"
    assert payload["items"][0]["unit_price"] == "100.00"
    assert payload["items"][0]["current_price"] == "120.00"


@pytest.mark.asyncio
async def test_cart_update_quantity_rejects_quantity_above_stock(client: AsyncClient, session_factory):
    ids = await seed_market(session_factory)
    cookies = auth_cookies(ids["buyer_user_id"], "buyer")

    add_response = await client.post(
        "/api/v1/cart/items",
        cookies=cookies,
        json={"product_id": ids["product_1_id"], "quantity": 1},
    )
    assert add_response.status_code == 200
    item_id = add_response.json()["items"][0]["id"]

    response = await client.patch(
        f"/api/v1/cart/items/{item_id}",
        cookies=cookies,
        json={"quantity": 10},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_checkout_splits_orders_subtracts_stock_and_clears_cart(client: AsyncClient, session_factory):
    ids = await seed_market(session_factory)
    cookies = auth_cookies(ids["buyer_user_id"], "buyer")

    response_1 = await client.post(
        "/api/v1/cart/items",
        cookies=cookies,
        json={"product_id": ids["product_1_id"], "quantity": 2},
    )
    assert response_1.status_code == 200

    response_2 = await client.post(
        "/api/v1/cart/items",
        cookies=cookies,
        json={"product_id": ids["product_2_id"], "quantity": 1},
    )
    assert response_2.status_code == 200

    checkout_response = await client.post(
        "/api/v1/orders",
        cookies=cookies,
        json={"delivery_address": "Strada Mare 10", "notes": "Sun before delivery"},
    )
    assert checkout_response.status_code == 200
    payload = checkout_response.json()
    assert payload["order_count"] == 2
    assert len(payload["orders"]) == 2
    assert {order["seller_id"] for order in payload["orders"]} == {
        ids["seller_1_id"],
        ids["seller_2_id"],
    }

    async with session_factory() as session:
        orders = list((await session.execute(select(Order))).scalars())
        assert len(orders) == 2

        product_1 = await session.get(Product, ids["product_1_id"])
        product_2 = await session.get(Product, ids["product_2_id"])
        assert product_1 is not None
        assert product_2 is not None
        assert product_1.stock == 3
        assert product_2.stock == 3

        history = list((await session.execute(select(OrderStatusHistory))).scalars())
        assert len(history) == 2

    cart_after_checkout = await client.get("/api/v1/cart", cookies=cookies)
    assert cart_after_checkout.status_code == 200
    assert cart_after_checkout.json()["items"] == []


@pytest.mark.asyncio
async def test_checkout_rejects_outdated_stock_and_keeps_cart(client: AsyncClient, session_factory):
    ids = await seed_market(session_factory)
    cookies = auth_cookies(ids["buyer_user_id"], "buyer")

    add_response = await client.post(
        "/api/v1/cart/items",
        cookies=cookies,
        json={"product_id": ids["product_1_id"], "quantity": 2},
    )
    assert add_response.status_code == 200

    async with session_factory() as session:
        product = await session.get(Product, ids["product_1_id"])
        assert product is not None
        product.stock = 1
        await session.commit()

    checkout_response = await client.post(
        "/api/v1/orders",
        cookies=cookies,
        json={"delivery_address": "Strada Mare 10", "notes": ""},
    )
    assert checkout_response.status_code == 422

    cart_response = await client.get("/api/v1/cart", cookies=cookies)
    assert cart_response.status_code == 200
    assert len(cart_response.json()["items"]) == 1
    assert cart_response.json()["items"][0]["quantity"] == 2


@pytest.mark.asyncio
async def test_order_status_tracking_endpoint_access_rules(client: AsyncClient, session_factory):
    ids = await seed_market(session_factory)
    buyer_cookies = auth_cookies(ids["buyer_user_id"], "buyer")

    add_response = await client.post(
        "/api/v1/cart/items",
        cookies=buyer_cookies,
        json={"product_id": ids["product_1_id"], "quantity": 1},
    )
    assert add_response.status_code == 200

    checkout_response = await client.post(
        "/api/v1/orders",
        cookies=buyer_cookies,
        json={"delivery_address": "Test address", "notes": "Test"},
    )
    assert checkout_response.status_code == 200
    order_id = checkout_response.json()["orders"][0]["id"]

    buyer_status = await client.get(f"/api/v1/orders/{order_id}/status", cookies=buyer_cookies)
    assert buyer_status.status_code == 200
    assert buyer_status.json()["id"] == order_id
    assert buyer_status.json()["status"] == "placed"
    assert len(buyer_status.json()["status_history"]) == 1

    seller_status = await client.get(
        f"/api/v1/orders/{order_id}/status",
        cookies=auth_cookies(ids["seller_user_id_1"], "seller"),
    )
    assert seller_status.status_code == 200

    forbidden_status = await client.get(
        f"/api/v1/orders/{order_id}/status",
        cookies=auth_cookies(ids["seller_user_id_3"], "seller"),
    )
    assert forbidden_status.status_code == 403
