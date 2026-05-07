from __future__ import annotations

import hashlib
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from api.dependencies.auth import ACCESS_TOKEN_COOKIE_NAME
from application.security import create_access_token, hash_password_pbkdf2
from models import Buyer, Category, Order, OrderItem, OrderStatus, Product, Review, Seller, User, UserRole


def auth_cookies(user_id: int, role: str) -> dict[str, str]:
    token = create_access_token(
        user_id=user_id,
        role=role,
        secret_key="test-secret",
        expires_in_minutes=60,
    )
    return {ACCESS_TOKEN_COOKIE_NAME: token}


async def seed_review_context(session_factory: async_sessionmaker[AsyncSession]) -> dict[str, int]:
    async with session_factory() as session:
        buyer_user = User(
            email="review-buyer@example.com",
            password_hash=hash_password_pbkdf2("password123"),
            role=UserRole.BUYER,
        )
        seller_user = User(
            email="review-seller@example.com",
            password_hash=hash_password_pbkdf2("password123"),
            role=UserRole.SELLER,
        )
        admin_user = User(
            email="review-admin@example.com",
            password_hash=hash_password_pbkdf2("password123"),
            role=UserRole.ADMIN,
        )
        session.add_all([buyer_user, seller_user, admin_user])
        await session.flush()

        buyer = Buyer(user_id=buyer_user.id, full_name="Review Buyer")
        seller = Seller(user_id=seller_user.id, company_name="Review Seller")
        category = Category(name="Review Category")
        session.add_all([buyer, seller, category])
        await session.flush()

        product = Product(
            seller_id=seller.id,
            category_id=category.id,
            title="Review Product",
            description="Product used for review endpoint tests",
            price=Decimal("199.99"),
            stock=5,
            is_available=True,
        )
        session.add(product)
        await session.flush()

        delivered_order = Order(
            order_number="ORD-2026-100001",
            buyer_id=buyer.id,
            seller_id=seller.id,
            status=OrderStatus.DELIVERED,
            delivery_address={"city": "Cluj", "street": "Main 10"},
            notes=None,
            total=Decimal("199.99"),
        )
        shipped_order = Order(
            order_number="ORD-2026-100002",
            buyer_id=buyer.id,
            seller_id=seller.id,
            status=OrderStatus.SHIPPED,
            delivery_address={"city": "Cluj", "street": "Main 20"},
            notes=None,
            total=Decimal("199.99"),
        )
        session.add_all([delivered_order, shipped_order])
        await session.flush()

        delivered_item = OrderItem(
            order_id=delivered_order.id,
            product_id=product.id,
            product_title=product.title,
            quantity=1,
            unit_price=product.price,
            subtotal=product.price,
        )
        shipped_item = OrderItem(
            order_id=shipped_order.id,
            product_id=product.id,
            product_title=product.title,
            quantity=1,
            unit_price=product.price,
            subtotal=product.price,
        )
        session.add_all([delivered_item, shipped_item])
        await session.commit()

        return {
            "buyer_user_id": buyer_user.id,
            "buyer_id": buyer.id,
            "buyer_email": buyer_user.email,
            "seller_user_id": seller_user.id,
            "admin_user_id": admin_user.id,
            "product_id": product.id,
        }


@pytest.mark.asyncio
async def test_create_review_returns_201_for_eligible_buyer(
    client: AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
):
    ids = await seed_review_context(session_factory)
    response = await client.post(
        f"/api/v1/products/{ids['product_id']}/reviews",
        cookies=auth_cookies(ids["buyer_user_id"], "buyer"),
        json={"rating": 5, "comment": "Excellent product!"},
    )

    assert response.status_code == 201
    payload = response.json()
    expected_hash = hashlib.md5(ids["buyer_email"].strip().lower().encode("utf-8")).hexdigest()  # noqa: S324

    assert payload["rating"] == 5
    assert payload["comment"] == "Excellent product!"
    assert payload["seller_reply"] is None
    assert payload["buyer"]["id"] == ids["buyer_id"]
    assert payload["buyer"]["full_name"] == "Review Buyer"
    assert payload["buyer"]["avatar_url"] == f"https://www.gravatar.com/avatar/{expected_hash}"
    assert "created_at" in payload

    async with session_factory() as session:
        review = (
            await session.execute(
                select(Review).where(
                    Review.user_id == ids["buyer_user_id"],
                    Review.product_id == ids["product_id"],
                )
            )
        ).scalar_one_or_none()
        assert review is not None

        product = await session.get(Product, ids["product_id"])
        assert product is not None
        assert float(product.avg_rating) == pytest.approx(5.0)
        assert product.review_count == 1


@pytest.mark.asyncio
async def test_create_review_returns_422_when_buyer_has_no_delivered_order(
    client: AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
):
    ids = await seed_review_context(session_factory)
    async with session_factory() as session:
        delivered_order = (
            await session.execute(
                select(Order).where(
                    Order.buyer_id == ids["buyer_id"],
                    Order.status == OrderStatus.DELIVERED,
                )
            )
        ).scalar_one()
        await session.execute(
            select(OrderItem).where(OrderItem.order_id == delivered_order.id)
        )
        await session.execute(
            OrderItem.__table__.delete().where(OrderItem.order_id == delivered_order.id)
        )
        await session.commit()

    response = await client.post(
        f"/api/v1/products/{ids['product_id']}/reviews",
        cookies=auth_cookies(ids["buyer_user_id"], "buyer"),
        json={"rating": 4, "comment": "Good"},
    )

    assert response.status_code == 422
    payload = response.json()
    assert payload["error"]["code"] == "UNPROCESSABLE_ENTITY"


@pytest.mark.asyncio
async def test_create_review_returns_409_for_duplicate_review(
    client: AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
):
    ids = await seed_review_context(session_factory)
    cookies = auth_cookies(ids["buyer_user_id"], "buyer")

    first = await client.post(
        f"/api/v1/products/{ids['product_id']}/reviews",
        cookies=cookies,
        json={"rating": 4, "comment": "Nice one"},
    )
    assert first.status_code == 201

    second = await client.post(
        f"/api/v1/products/{ids['product_id']}/reviews",
        cookies=cookies,
        json={"rating": 5, "comment": "Second review"},
    )
    assert second.status_code == 409
    payload = second.json()
    assert payload["error"]["code"] == "CONFLICT"


@pytest.mark.asyncio
async def test_create_review_auth_guards(
    client: AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
):
    ids = await seed_review_context(session_factory)
    url = f"/api/v1/products/{ids['product_id']}/reviews"

    unauthenticated = await client.post(url, json={"rating": 5})
    assert unauthenticated.status_code == 401

    seller_forbidden = await client.post(
        url,
        cookies=auth_cookies(ids["seller_user_id"], "seller"),
        json={"rating": 5},
    )
    assert seller_forbidden.status_code == 403

    admin_forbidden = await client.post(
        url,
        cookies=auth_cookies(ids["admin_user_id"], "admin"),
        json={"rating": 5},
    )
    assert admin_forbidden.status_code == 403


@pytest.mark.asyncio
async def test_create_review_validation_errors(
    client: AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
):
    ids = await seed_review_context(session_factory)
    cookies = auth_cookies(ids["buyer_user_id"], "buyer")

    invalid_rating = await client.post(
        f"/api/v1/products/{ids['product_id']}/reviews",
        cookies=cookies,
        json={"rating": 0, "comment": "x"},
    )
    assert invalid_rating.status_code == 400
    assert invalid_rating.json()["error"]["code"] == "VALIDATION_ERROR"

    invalid_comment = await client.post(
        f"/api/v1/products/{ids['product_id']}/reviews",
        cookies=cookies,
        json={"rating": 5, "comment": "x" * 2001},
    )
    assert invalid_comment.status_code == 400
    assert invalid_comment.json()["error"]["code"] == "VALIDATION_ERROR"
