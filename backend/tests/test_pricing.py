from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from api.dependencies.auth import ACCESS_TOKEN_COOKIE_NAME
from application.security import create_access_token
from models import (
    Buyer,
    Category,
    Order,
    OrderItem,
    OrderStatus,
    PriceHistory,
    Product,
    Seller,
    User,
    UserRole,
)


def seller_cookies(user_id: int) -> dict[str, str]:
    token = create_access_token(
        user_id=user_id,
        role="seller",
        secret_key="test-secret",
        expires_in_minutes=60,
    )
    return {ACCESS_TOKEN_COOKIE_NAME: token}


def buyer_cookies(user_id: int) -> dict[str, str]:
    token = create_access_token(
        user_id=user_id,
        role="buyer",
        secret_key="test-secret",
        expires_in_minutes=60,
    )
    return {ACCESS_TOKEN_COOKIE_NAME: token}


async def seed_pricing_data(session_factory: async_sessionmaker[AsyncSession]) -> dict:
    async with session_factory() as session:
        seller_user = User(email="pricing-seller@test.com", password_hash="hash", role=UserRole.SELLER)
        buyer_user = User(email="pricing-buyer@test.com", password_hash="hash", role=UserRole.BUYER)
        other_seller_user = User(email="other-seller@test.com", password_hash="hash", role=UserRole.SELLER)
        session.add_all([seller_user, buyer_user, other_seller_user])
        await session.flush()

        seller = Seller(user_id=seller_user.id, company_name="Pricing Co")
        buyer = Buyer(user_id=buyer_user.id, full_name="Test Buyer", address="Cluj")
        other_seller = Seller(user_id=other_seller_user.id, company_name="Other Co")
        category = Category(name="Pricing Category")
        session.add_all([seller, buyer, other_seller, category])
        await session.flush()

        product_popular = Product(
            seller_id=seller.id,
            category_id=category.id,
            title="Popular Product",
            price=Decimal("100.00"),
            stock=100,
        )
        product_low = Product(
            seller_id=seller.id,
            category_id=category.id,
            title="Low Orders Product",
            price=Decimal("50.00"),
            stock=100,
        )
        other_product = Product(
            seller_id=other_seller.id,
            category_id=category.id,
            title="Other Seller Product",
            price=Decimal("75.00"),
            stock=100,
        )
        session.add_all([product_popular, product_low, other_product])
        await session.flush()

        now = datetime.now(timezone.utc)

        for i in range(15):
            order = Order(
                order_number=f"ORD-TEST-P{i:04d}",
                buyer_id=buyer.id,
                seller_id=seller.id,
                status=OrderStatus.PLACED,
                delivery_address={"city": "Cluj"},
                total=Decimal("100.00"),
                placed_at=now,
            )
            session.add(order)
            await session.flush()
            item = OrderItem(
                order_id=order.id,
                product_id=product_popular.id,
                product_title=product_popular.title,
                quantity=1,
                unit_price=Decimal("100.00"),
                subtotal=Decimal("100.00"),
            )
            session.add(item)

        for i in range(5):
            order = Order(
                order_number=f"ORD-TEST-L{i:04d}",
                buyer_id=buyer.id,
                seller_id=seller.id,
                status=OrderStatus.PLACED,
                delivery_address={"city": "Cluj"},
                total=Decimal("50.00"),
                placed_at=now,
            )
            session.add(order)
            await session.flush()
            item = OrderItem(
                order_id=order.id,
                product_id=product_low.id,
                product_title=product_low.title,
                quantity=1,
                unit_price=Decimal("50.00"),
                subtotal=Decimal("50.00"),
            )
            session.add(item)

        await session.commit()

        return {
            "seller_user_id": seller_user.id,
            "buyer_user_id": buyer_user.id,
            "other_seller_user_id": other_seller_user.id,
            "seller_id": seller.id,
            "product_popular_id": product_popular.id,
            "product_low_id": product_low.id,
            "other_product_id": other_product.id,
        }


@pytest.mark.asyncio
async def test_get_suggestions_returns_all_seller_products(
    client: AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
):
    ids = await seed_pricing_data(session_factory)
    cookies = seller_cookies(ids["seller_user_id"])

    response = await client.get("/api/v1/pricing/suggestions", cookies=cookies)

    assert response.status_code == 200
    data = response.json()
    assert "suggestions" in data
    assert len(data["suggestions"]) == 2

    product_ids = {s["product_id"] for s in data["suggestions"]}
    assert ids["product_popular_id"] in product_ids
    assert ids["product_low_id"] in product_ids


@pytest.mark.asyncio
async def test_get_suggestions_insufficient_data_flag(
    client: AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
):
    ids = await seed_pricing_data(session_factory)
    cookies = seller_cookies(ids["seller_user_id"])

    response = await client.get("/api/v1/pricing/suggestions", cookies=cookies)

    assert response.status_code == 200
    suggestions = {s["product_id"]: s for s in response.json()["suggestions"]}

    assert suggestions[ids["product_popular_id"]]["insufficient_data"] is False
    assert suggestions[ids["product_low_id"]]["insufficient_data"] is True


@pytest.mark.asyncio
async def test_get_suggestions_with_product_id_filter(
    client: AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
):
    ids = await seed_pricing_data(session_factory)
    cookies = seller_cookies(ids["seller_user_id"])

    response = await client.get(
        f"/api/v1/pricing/suggestions?product_id={ids['product_popular_id']}",
        cookies=cookies,
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["suggestions"]) == 1
    assert data["suggestions"][0]["product_id"] == ids["product_popular_id"]


@pytest.mark.asyncio
async def test_get_suggestions_product_not_owned(
    client: AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
):
    ids = await seed_pricing_data(session_factory)
    cookies = seller_cookies(ids["seller_user_id"])

    response = await client.get(
        f"/api/v1/pricing/suggestions?product_id={ids['other_product_id']}",
        cookies=cookies,
    )

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_get_suggestions_unauthenticated(
    client: AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
):
    await seed_pricing_data(session_factory)

    response = await client.get("/api/v1/pricing/suggestions")

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_suggestions_buyer_role_forbidden(
    client: AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
):
    ids = await seed_pricing_data(session_factory)
    cookies = buyer_cookies(ids["buyer_user_id"])

    response = await client.get("/api/v1/pricing/suggestions", cookies=cookies)

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_suggestion_response_shape(
    client: AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
):
    ids = await seed_pricing_data(session_factory)
    cookies = seller_cookies(ids["seller_user_id"])

    response = await client.get(
        f"/api/v1/pricing/suggestions?product_id={ids['product_popular_id']}",
        cookies=cookies,
    )

    assert response.status_code == 200
    s = response.json()["suggestions"][0]

    assert s["product_id"] == ids["product_popular_id"]
    assert s["product_title"] == "Popular Product"
    assert "current_price" in s
    assert "suggested_price" in s
    assert "direction" in s
    assert s["direction"] in ("increase", "decrease", "maintain")
    assert "demand_trend" in s
    assert s["demand_trend"] in ("rising", "declining", "stable")
    assert s["data_period_days"] == 30
    assert isinstance(s["insufficient_data"], bool)


@pytest.mark.asyncio
async def test_price_history_trigger_on_price_change(
    client: AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
):
    ids = await seed_pricing_data(session_factory)
    cookies = seller_cookies(ids["seller_user_id"])

    response = await client.patch(
        f"/api/v1/sellers/me/products/{ids['product_popular_id']}",
        cookies=cookies,
        json={"price": "120.00"},
    )
    assert response.status_code == 200

    async with session_factory() as session:
        result = await session.execute(
            select(PriceHistory).where(
                PriceHistory.product_id == ids["product_popular_id"]
            )
        )
        history = result.scalars().all()

    assert len(history) == 1
    assert history[0].old_price == Decimal("100.00")
    assert history[0].new_price == Decimal("120.00")


@pytest.mark.asyncio
async def test_price_history_no_entry_when_price_unchanged(
    client: AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
):
    ids = await seed_pricing_data(session_factory)
    cookies = seller_cookies(ids["seller_user_id"])

    response = await client.patch(
        f"/api/v1/sellers/me/products/{ids['product_popular_id']}",
        cookies=cookies,
        json={"stock": 50},
    )
    assert response.status_code == 200

    async with session_factory() as session:
        result = await session.execute(
            select(PriceHistory).where(
                PriceHistory.product_id == ids["product_popular_id"]
            )
        )
        history = result.scalars().all()

    assert len(history) == 0
