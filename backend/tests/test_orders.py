from __future__ import annotations

from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from api.dependencies.auth import ACCESS_TOKEN_COOKIE_NAME
from application.security import create_access_token, hash_password_pbkdf2
from models import (
    Buyer,
    Category,
    Order,
    OrderItem,
    OrderStatus,
    OrderStatusHistory,
    Product,
    Seller,
    User,
    UserRole,
)


def auth_cookies(user_id: int, role: str) -> dict[str, str]:
    token = create_access_token(
        user_id=user_id,
        role=role,
        secret_key="test-secret",
        expires_in_minutes=60,
    )
    return {ACCESS_TOKEN_COOKIE_NAME: token}


async def seed_order_graph(session_factory: async_sessionmaker) -> dict[str, int]:
    async with session_factory() as session:
        buyer_user = User(
            email="buyer@example.com",
            password_hash=hash_password_pbkdf2("password123"),
            role=UserRole.BUYER,
        )
        other_buyer_user = User(
            email="buyer2@example.com",
            password_hash=hash_password_pbkdf2("password123"),
            role=UserRole.BUYER,
        )
        seller_user = User(
            email="seller@example.com",
            password_hash=hash_password_pbkdf2("password123"),
            role=UserRole.SELLER,
        )
        other_seller_user = User(
            email="seller2@example.com",
            password_hash=hash_password_pbkdf2("password123"),
            role=UserRole.SELLER,
        )
        session.add_all([buyer_user, other_buyer_user, seller_user, other_seller_user])
        await session.flush()

        buyer = Buyer(user_id=buyer_user.id, full_name="Buyer One", address="Cluj")
        other_buyer = Buyer(user_id=other_buyer_user.id, full_name="Buyer Two", address="Iasi")
        seller = Seller(user_id=seller_user.id, company_name="Seller One")
        other_seller = Seller(user_id=other_seller_user.id, company_name="Seller Two")
        category = Category(name="Electronics")
        session.add_all([buyer, other_buyer, seller, other_seller, category])
        await session.flush()

        seller_product = Product(
            seller_id=seller.id,
            category_id=category.id,
            title="Laptop",
            description="Gaming laptop",
            price=Decimal("100.00"),
            stock=10,
            is_available=True,
        )
        other_seller_product = Product(
            seller_id=other_seller.id,
            category_id=category.id,
            title="Phone",
            description="Smart phone",
            price=Decimal("50.00"),
            stock=10,
            is_available=True,
        )
        session.add_all([seller_product, other_seller_product])
        await session.flush()

        seller_order = Order(
            order_number="ORD-2026-000001",
            buyer_id=buyer.id,
            seller_id=seller.id,
            status=OrderStatus.PLACED,
            delivery_address={"city": "Cluj", "street": "Main 1"},
            notes="Call on arrival",
            total=Decimal("200.00"),
        )
        other_seller_order = Order(
            order_number="ORD-2026-000002",
            buyer_id=buyer.id,
            seller_id=other_seller.id,
            status=OrderStatus.CONFIRMED,
            delivery_address={"city": "Cluj", "street": "Main 2"},
            notes=None,
            total=Decimal("50.00"),
        )
        other_buyer_order = Order(
            order_number="ORD-2026-000003",
            buyer_id=other_buyer.id,
            seller_id=seller.id,
            status=OrderStatus.SHIPPED,
            delivery_address={"city": "Iasi", "street": "Second 5"},
            notes=None,
            total=Decimal("100.00"),
        )
        session.add_all([seller_order, other_seller_order, other_buyer_order])
        await session.flush()

        session.add_all(
            [
                OrderItem(
                    order_id=seller_order.id,
                    product_id=seller_product.id,
                    product_title="Laptop",
                    quantity=2,
                    unit_price=Decimal("100.00"),
                    subtotal=Decimal("200.00"),
                ),
                OrderItem(
                    order_id=other_seller_order.id,
                    product_id=other_seller_product.id,
                    product_title="Phone",
                    quantity=1,
                    unit_price=Decimal("50.00"),
                    subtotal=Decimal("50.00"),
                ),
                OrderItem(
                    order_id=other_buyer_order.id,
                    product_id=seller_product.id,
                    product_title="Laptop",
                    quantity=1,
                    unit_price=Decimal("100.00"),
                    subtotal=Decimal("100.00"),
                ),
            ]
        )
        session.add_all(
            [
                OrderStatusHistory(
                    order_id=seller_order.id,
                    status=OrderStatus.PLACED,
                    changed_by_role="buyer",
                ),
                OrderStatusHistory(
                    order_id=other_seller_order.id,
                    status=OrderStatus.PLACED,
                    changed_by_role="buyer",
                ),
                OrderStatusHistory(
                    order_id=other_seller_order.id,
                    status=OrderStatus.CONFIRMED,
                    changed_by_role="seller",
                ),
                OrderStatusHistory(
                    order_id=other_buyer_order.id,
                    status=OrderStatus.PLACED,
                    changed_by_role="buyer",
                ),
                OrderStatusHistory(
                    order_id=other_buyer_order.id,
                    status=OrderStatus.CONFIRMED,
                    changed_by_role="seller",
                ),
                OrderStatusHistory(
                    order_id=other_buyer_order.id,
                    status=OrderStatus.SHIPPED,
                    changed_by_role="seller",
                ),
            ]
        )
        await session.commit()

        return {
            "seller_user_id": seller_user.id,
            "other_seller_user_id": other_seller_user.id,
            "buyer_user_id": buyer_user.id,
            "other_buyer_user_id": other_buyer_user.id,
            "seller_order_id": seller_order.id,
            "other_seller_order_id": other_seller_order.id,
            "other_buyer_order_id": other_buyer_order.id,
        }


@pytest.mark.asyncio
async def test_list_seller_orders_scopes_and_filters(client: AsyncClient, session_factory):
    ids = await seed_order_graph(session_factory)
    cookies = auth_cookies(ids["seller_user_id"], "seller")

    response = await client.get("/api/v1/sellers/me/orders", cookies=cookies)

    assert response.status_code == 200
    payload = response.json()
    assert payload["page"] == 1
    assert payload["page_size"] == 20
    assert payload["total"] == 2
    assert {item["id"] for item in payload["items"]} == {
        ids["seller_order_id"],
        ids["other_buyer_order_id"],
    }
    first_item = payload["items"][0]
    assert "buyer" in first_item
    assert "items" in first_item
    assert "total" in first_item

    filtered = await client.get(
        "/api/v1/sellers/me/orders",
        cookies=cookies,
        params={"status": "placed"},
    )
    assert filtered.status_code == 200
    filtered_payload = filtered.json()
    assert filtered_payload["total"] == 1
    assert filtered_payload["items"][0]["id"] == ids["seller_order_id"]


@pytest.mark.asyncio
async def test_list_buyer_orders_scopes_and_filters(client: AsyncClient, session_factory):
    ids = await seed_order_graph(session_factory)
    cookies = auth_cookies(ids["buyer_user_id"], "buyer")

    response = await client.get("/api/v1/orders", cookies=cookies)

    assert response.status_code == 200
    payload = response.json()
    assert payload["pagination"]["page"] == 1
    assert payload["pagination"]["page_size"] == 20
    assert payload["pagination"]["total_items"] == 2
    assert payload["pagination"]["total_pages"] == 1
    assert {item["id"] for item in payload["data"]} == {
        ids["seller_order_id"],
        ids["other_seller_order_id"],
    }
    first_item = payload["data"][0]
    assert "seller" in first_item
    assert first_item["item_count"] >= 1
    assert "updated_at" in first_item

    filtered = await client.get(
        "/api/v1/orders",
        cookies=cookies,
        params={"status": "placed"},
    )
    assert filtered.status_code == 200
    filtered_payload = filtered.json()
    assert filtered_payload["pagination"]["total_items"] == 1
    assert filtered_payload["data"][0]["id"] == ids["seller_order_id"]


@pytest.mark.asyncio
async def test_list_buyer_orders_pagination_and_role_restriction(client: AsyncClient, session_factory):
    ids = await seed_order_graph(session_factory)

    paged_response = await client.get(
        "/api/v1/orders",
        cookies=auth_cookies(ids["buyer_user_id"], "buyer"),
        params={"page": 2, "page_size": 1},
    )
    assert paged_response.status_code == 200
    paged_payload = paged_response.json()
    assert paged_payload["pagination"]["page"] == 2
    assert paged_payload["pagination"]["page_size"] == 1
    assert paged_payload["pagination"]["total_items"] == 2
    assert paged_payload["pagination"]["total_pages"] == 2
    assert len(paged_payload["data"]) == 1

    seller_forbidden = await client.get(
        "/api/v1/orders",
        cookies=auth_cookies(ids["seller_user_id"], "seller"),
    )
    assert seller_forbidden.status_code == 403


@pytest.mark.asyncio
async def test_list_seller_orders_pagination_defaults_work(client: AsyncClient, session_factory):
    ids = await seed_order_graph(session_factory)
    cookies = auth_cookies(ids["seller_user_id"], "seller")

    response = await client.get(
        "/api/v1/sellers/me/orders",
        cookies=cookies,
        params={"page": 2, "page_size": 1},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["page"] == 2
    assert payload["page_size"] == 1
    assert payload["total"] == 2
    assert len(payload["items"]) == 1


@pytest.mark.asyncio
async def test_get_order_details_allows_authorized_seller_and_buyer(client: AsyncClient, session_factory):
    ids = await seed_order_graph(session_factory)

    seller_response = await client.get(
        f"/api/v1/orders/{ids['seller_order_id']}",
        cookies=auth_cookies(ids["seller_user_id"], "seller"),
    )
    assert seller_response.status_code == 200
    seller_payload = seller_response.json()
    assert seller_payload["id"] == ids["seller_order_id"]
    assert seller_payload["seller"]["company_name"] == "Seller One"
    assert seller_payload["buyer"]["email"] == "buyer@example.com"
    assert seller_payload["status_history"][0]["status"] == "placed"
    assert seller_payload["items"][0]["subtotal"] == "200.00"

    buyer_response = await client.get(
        f"/api/v1/orders/{ids['seller_order_id']}",
        cookies=auth_cookies(ids["buyer_user_id"], "buyer"),
    )
    assert buyer_response.status_code == 200


@pytest.mark.asyncio
async def test_get_order_details_rejects_wrong_owner_and_unauthenticated(client: AsyncClient, session_factory):
    ids = await seed_order_graph(session_factory)

    seller_forbidden = await client.get(
        f"/api/v1/orders/{ids['other_seller_order_id']}",
        cookies=auth_cookies(ids["seller_user_id"], "seller"),
    )
    assert seller_forbidden.status_code == 403

    buyer_forbidden = await client.get(
        f"/api/v1/orders/{ids['other_buyer_order_id']}",
        cookies=auth_cookies(ids["buyer_user_id"], "buyer"),
    )
    assert buyer_forbidden.status_code == 403

    unauthenticated = await client.get(f"/api/v1/orders/{ids['seller_order_id']}")
    assert unauthenticated.status_code == 401


@pytest.mark.asyncio
async def test_get_order_details_returns_404_for_missing_order(client: AsyncClient, session_factory):
    ids = await seed_order_graph(session_factory)

    response = await client.get(
        "/api/v1/orders/99999",
        cookies=auth_cookies(ids["seller_user_id"], "seller"),
    )

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_seller_can_perform_valid_status_transitions(client: AsyncClient, session_factory):
    ids = await seed_order_graph(session_factory)
    cookies = auth_cookies(ids["seller_user_id"], "seller")

    confirm_response = await client.patch(
        f"/api/v1/orders/{ids['seller_order_id']}/status",
        cookies=cookies,
        json={"status": "confirmed"},
    )
    assert confirm_response.status_code == 200
    assert confirm_response.json()["status"] == "confirmed"
    assert confirm_response.json()["valid_next_transitions"] == ["shipped", "cancelled"]

    ship_response = await client.patch(
        f"/api/v1/orders/{ids['seller_order_id']}/status",
        cookies=cookies,
        json={"status": "shipped"},
    )
    assert ship_response.status_code == 200
    assert ship_response.json()["status"] == "shipped"

    deliver_response = await client.patch(
        f"/api/v1/orders/{ids['seller_order_id']}/status",
        cookies=cookies,
        json={"status": "delivered"},
    )
    assert deliver_response.status_code == 200
    assert deliver_response.json()["status"] == "delivered"
    assert deliver_response.json()["valid_next_transitions"] == []


@pytest.mark.asyncio
async def test_buyer_can_cancel_only_from_placed(client: AsyncClient, session_factory):
    ids = await seed_order_graph(session_factory)

    placed_cancel = await client.patch(
        f"/api/v1/orders/{ids['seller_order_id']}/status",
        cookies=auth_cookies(ids["buyer_user_id"], "buyer"),
        json={"status": "cancelled"},
    )
    assert placed_cancel.status_code == 200
    assert placed_cancel.json()["status"] == "cancelled"
    assert placed_cancel.json()["valid_next_transitions"] == []

    confirmed_cancel = await client.patch(
        f"/api/v1/orders/{ids['other_seller_order_id']}/status",
        cookies=auth_cookies(ids["buyer_user_id"], "buyer"),
        json={"status": "cancelled"},
    )
    assert confirmed_cancel.status_code == 422


@pytest.mark.asyncio
async def test_buyer_cannot_set_non_cancelled_statuses(client: AsyncClient, session_factory):
    ids = await seed_order_graph(session_factory)

    response = await client.patch(
        f"/api/v1/orders/{ids['seller_order_id']}/status",
        cookies=auth_cookies(ids["buyer_user_id"], "buyer"),
        json={"status": "confirmed"},
    )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_status_updates_reject_unauthorized_ownership(client: AsyncClient, session_factory):
    ids = await seed_order_graph(session_factory)

    response = await client.patch(
        f"/api/v1/orders/{ids['other_seller_order_id']}/status",
        cookies=auth_cookies(ids["seller_user_id"], "seller"),
        json={"status": "cancelled"},
    )

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_status_update_rejects_invalid_status_payload(client: AsyncClient, session_factory):
    ids = await seed_order_graph(session_factory)

    response = await client.patch(
        f"/api/v1/orders/{ids['seller_order_id']}/status",
        cookies=auth_cookies(ids["seller_user_id"], "seller"),
        json={"status": "processing"},
    )

    assert response.status_code == 400


@pytest.mark.asyncio
async def test_status_update_persists_order_and_history(client: AsyncClient, session_factory):
    ids = await seed_order_graph(session_factory)

    response = await client.patch(
        f"/api/v1/orders/{ids['seller_order_id']}/status",
        cookies=auth_cookies(ids["seller_user_id"], "seller"),
        json={"status": "confirmed"},
    )
    assert response.status_code == 200

    async with session_factory() as session:
        order = await session.get(Order, ids["seller_order_id"])
        assert order is not None
        assert order.status == OrderStatus.CONFIRMED

        history_statement = (
            select(OrderStatusHistory)
            .where(OrderStatusHistory.order_id == ids["seller_order_id"])
            .order_by(OrderStatusHistory.changed_at.asc(), OrderStatusHistory.id.asc())
        )
        history = list((await session.execute(history_statement)).scalars())
        assert [entry.status for entry in history] == [
            OrderStatus.PLACED,
            OrderStatus.CONFIRMED,
        ]
        assert history[-1].changed_by_role == "seller"


@pytest.mark.asyncio
async def test_order_details_returns_history_in_stable_chronological_order(client: AsyncClient, session_factory):
    ids = await seed_order_graph(session_factory)
    cookies = auth_cookies(ids["seller_user_id"], "seller")

    confirm_response = await client.patch(
        f"/api/v1/orders/{ids['seller_order_id']}/status",
        cookies=cookies,
        json={"status": "confirmed"},
    )
    assert confirm_response.status_code == 200

    cancel_response = await client.patch(
        f"/api/v1/orders/{ids['seller_order_id']}/status",
        cookies=cookies,
        json={"status": "cancelled"},
    )
    assert cancel_response.status_code == 200

    details_response = await client.get(
        f"/api/v1/orders/{ids['seller_order_id']}",
        cookies=cookies,
    )
    assert details_response.status_code == 200
    payload = details_response.json()
    assert [entry["status"] for entry in payload["status_history"]] == [
        "placed",
        "confirmed",
        "cancelled",
    ]
