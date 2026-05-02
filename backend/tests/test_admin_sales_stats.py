from __future__ import annotations

from datetime import datetime
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker

from api.dependencies.auth import ACCESS_TOKEN_COOKIE_NAME
from application.security import create_access_token, hash_password_pbkdf2
from models import Buyer, Category, Order, OrderItem, OrderStatus, Product, Seller, User, UserRole


def auth_cookies(user_id: int, role: str) -> dict[str, str]:
    token = create_access_token(
        user_id=user_id,
        role=role,
        secret_key="test-secret",
        expires_in_minutes=60,
    )
    return {ACCESS_TOKEN_COOKIE_NAME: token}


async def seed_sales_stats_graph(session_factory: async_sessionmaker) -> dict[str, int]:
    async with session_factory() as session:
        admin_user = User(
            email="admin@example.com",
            password_hash=hash_password_pbkdf2("password123"),
            role=UserRole.ADMIN,
        )
        seller_user = User(
            email="seller@example.com",
            password_hash=hash_password_pbkdf2("password123"),
            role=UserRole.SELLER,
        )
        buyer_user = User(
            email="buyer@example.com",
            password_hash=hash_password_pbkdf2("password123"),
            role=UserRole.BUYER,
        )
        session.add_all([admin_user, seller_user, buyer_user])
        await session.flush()

        seller = Seller(user_id=seller_user.id, company_name="Seller One")
        buyer = Buyer(user_id=buyer_user.id, full_name="Buyer One", address="Cluj")
        electronics = Category(name="Electronics")
        books = Category(name="Books")
        session.add_all([seller, buyer, electronics, books])
        await session.flush()

        laptop = Product(
            seller_id=seller.id,
            category_id=electronics.id,
            title="Laptop",
            description="Gaming laptop",
            price=Decimal("200.00"),
            stock=10,
            is_available=True,
        )
        novel = Product(
            seller_id=seller.id,
            category_id=books.id,
            title="Novel",
            description="Paperback novel",
            price=Decimal("50.00"),
            stock=10,
            is_available=True,
        )
        ignored_product = Product(
            seller_id=seller.id,
            category_id=electronics.id,
            title="Ignored Laptop",
            description="Not delivered",
            price=Decimal("900.00"),
            stock=10,
            is_available=True,
        )
        session.add_all([laptop, novel, ignored_product])
        await session.flush()

        delivered_electronics = Order(
            order_number="ORD-STATS-000001",
            buyer_id=buyer.id,
            seller_id=seller.id,
            status=OrderStatus.DELIVERED,
            delivery_address={"city": "Cluj", "street": "Main 1"},
            notes=None,
            total=Decimal("200.00"),
            placed_at=datetime(2026, 4, 3, 12, 0, 0),
        )
        delivered_books = Order(
            order_number="ORD-STATS-000002",
            buyer_id=buyer.id,
            seller_id=seller.id,
            status=OrderStatus.DELIVERED,
            delivery_address={"city": "Iasi", "street": "Second 5"},
            notes=None,
            total=Decimal("50.00"),
            placed_at=datetime(2026, 4, 6, 9, 30, 0),
        )
        placed_order = Order(
            order_number="ORD-STATS-000003",
            buyer_id=buyer.id,
            seller_id=seller.id,
            status=OrderStatus.PLACED,
            delivery_address={"city": "Cluj", "street": "Main 2"},
            notes=None,
            total=Decimal("900.00"),
            placed_at=datetime(2026, 4, 7, 10, 0, 0),
        )
        session.add_all([delivered_electronics, delivered_books, placed_order])
        await session.flush()

        session.add_all(
            [
                OrderItem(
                    order_id=delivered_electronics.id,
                    product_id=laptop.id,
                    product_title="Laptop",
                    quantity=1,
                    unit_price=Decimal("200.00"),
                    subtotal=Decimal("200.00"),
                ),
                OrderItem(
                    order_id=delivered_books.id,
                    product_id=novel.id,
                    product_title="Novel",
                    quantity=1,
                    unit_price=Decimal("50.00"),
                    subtotal=Decimal("50.00"),
                ),
                OrderItem(
                    order_id=placed_order.id,
                    product_id=ignored_product.id,
                    product_title="Ignored Laptop",
                    quantity=1,
                    unit_price=Decimal("900.00"),
                    subtotal=Decimal("900.00"),
                ),
            ]
        )
        await session.commit()

        return {
            "admin_user_id": admin_user.id,
            "seller_user_id": seller_user.id,
            "buyer_user_id": buyer_user.id,
            "electronics_category_id": electronics.id,
            "books_category_id": books.id,
        }


@pytest.mark.asyncio
async def test_admin_can_fetch_category_sales_stats(client: AsyncClient, session_factory):
    ids = await seed_sales_stats_graph(session_factory)

    response = await client.get(
        "/api/v1/admin/stats/sales",
        cookies=auth_cookies(ids["admin_user_id"], "admin"),
        params={
            "group_by": "category",
            "date_from": "2026-04-01",
            "date_to": "2026-04-30",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["group_by"] == "category"
    assert payload["total_revenue"] == 250.0
    assert payload["total_orders"] == 2
    assert payload["series"] == [
        {
            "id": ids["electronics_category_id"],
            "label": "Electronics",
            "revenue": 200.0,
            "orders": 1,
            "percentage": 80.0,
        },
        {
            "id": ids["books_category_id"],
            "label": "Books",
            "revenue": 50.0,
            "orders": 1,
            "percentage": 20.0,
        },
    ]


@pytest.mark.asyncio
async def test_sales_stats_are_admin_only(client: AsyncClient, session_factory):
    ids = await seed_sales_stats_graph(session_factory)
    params = {
        "group_by": "category",
        "date_from": "2026-04-01",
        "date_to": "2026-04-30",
    }

    seller_response = await client.get(
        "/api/v1/admin/stats/sales",
        cookies=auth_cookies(ids["seller_user_id"], "seller"),
        params=params,
    )
    buyer_response = await client.get(
        "/api/v1/admin/stats/sales",
        cookies=auth_cookies(ids["buyer_user_id"], "buyer"),
        params=params,
    )
    anonymous_response = await client.get("/api/v1/admin/stats/sales", params=params)

    assert seller_response.status_code == 403
    assert buyer_response.status_code == 403
    assert anonymous_response.status_code == 401


@pytest.mark.asyncio
async def test_admin_can_group_sales_stats_by_region(client: AsyncClient, session_factory):
    ids = await seed_sales_stats_graph(session_factory)

    response = await client.get(
        "/api/v1/admin/stats/sales",
        cookies=auth_cookies(ids["admin_user_id"], "admin"),
        params={
            "group_by": "region",
            "date_from": "2026-04-01",
            "date_to": "2026-04-30",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["series"] == [
        {
            "id": None,
            "label": "Cluj",
            "revenue": 200.0,
            "orders": 1,
            "percentage": 80.0,
        },
        {
            "id": None,
            "label": "Iasi",
            "revenue": 50.0,
            "orders": 1,
            "percentage": 20.0,
        },
    ]


@pytest.mark.asyncio
async def test_admin_can_group_sales_stats_by_period(client: AsyncClient, session_factory):
    ids = await seed_sales_stats_graph(session_factory)

    day_response = await client.get(
        "/api/v1/admin/stats/sales",
        cookies=auth_cookies(ids["admin_user_id"], "admin"),
        params={
            "group_by": "period",
            "period": "day",
            "date_from": "2026-04-01",
            "date_to": "2026-04-30",
        },
    )
    week_response = await client.get(
        "/api/v1/admin/stats/sales",
        cookies=auth_cookies(ids["admin_user_id"], "admin"),
        params={
            "group_by": "period",
            "period": "week",
            "date_from": "2026-04-01",
            "date_to": "2026-04-30",
        },
    )
    month_response = await client.get(
        "/api/v1/admin/stats/sales",
        cookies=auth_cookies(ids["admin_user_id"], "admin"),
        params={
            "group_by": "period",
            "period": "month",
            "date_from": "2026-04-01",
            "date_to": "2026-04-30",
        },
    )

    assert day_response.status_code == 200
    assert [item["label"] for item in day_response.json()["series"]] == [
        "2026-04-03",
        "2026-04-06",
    ]

    assert week_response.status_code == 200
    assert [item["label"] for item in week_response.json()["series"]] == [
        "2026-W13",
        "2026-W14",
    ]

    assert month_response.status_code == 200
    assert month_response.json()["series"] == [
        {
            "id": None,
            "label": "2026-04",
            "revenue": 250.0,
            "orders": 2,
            "percentage": 100.0,
        }
    ]


@pytest.mark.asyncio
async def test_sales_stats_reject_invalid_query_params(client: AsyncClient, session_factory):
    ids = await seed_sales_stats_graph(session_factory)
    cookies = auth_cookies(ids["admin_user_id"], "admin")

    missing_period = await client.get(
        "/api/v1/admin/stats/sales",
        cookies=cookies,
        params={
            "group_by": "period",
            "date_from": "2026-04-01",
            "date_to": "2026-04-30",
        },
    )
    invalid_period = await client.get(
        "/api/v1/admin/stats/sales",
        cookies=cookies,
        params={
            "group_by": "period",
            "period": "quarter",
            "date_from": "2026-04-01",
            "date_to": "2026-04-30",
        },
    )
    missing_dates = await client.get(
        "/api/v1/admin/stats/sales",
        cookies=cookies,
        params={"group_by": "category"},
    )
    invalid_range = await client.get(
        "/api/v1/admin/stats/sales",
        cookies=cookies,
        params={
            "group_by": "category",
            "date_from": "2026-05-01",
            "date_to": "2026-04-01",
        },
    )

    assert missing_period.status_code == 400
    assert invalid_period.status_code == 400
    assert missing_dates.status_code == 400
    assert invalid_range.status_code == 400
