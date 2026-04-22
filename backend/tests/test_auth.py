from __future__ import annotations

from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker

from api.dependencies.auth import (
    ACCESS_TOKEN_COOKIE_NAME,
)
from application.security import hash_password_pbkdf2
from models import Buyer, Category, User, UserRole


async def seed_user(session_factory: async_sessionmaker):
    async with session_factory() as session:
        session.add(
            User(
                email="seller@example.com",
                password_hash=hash_password_pbkdf2("password123"),
                role=UserRole.SELLER,
            )
        )
        await session.commit()


async def seed_buyer_user(session_factory: async_sessionmaker):
    async with session_factory() as session:
        category_a = Category(name="Electronics")
        category_b = Category(name="Books")
        session.add_all([category_a, category_b])
        await session.flush()

        user = User(
            email="buyer@example.com",
            password_hash=hash_password_pbkdf2("password123"),
            role=UserRole.BUYER,
        )
        session.add(user)
        await session.flush()

        session.add(
            Buyer(
                user_id=user.id,
                full_name="Buyer Name",
                phone="+40711111111",
                address="Cluj-Napoca",
                preferred_price_min=Decimal("50.00"),
                preferred_price_max=Decimal("250.00"),
                preferred_categories=[category_a, category_b],
            )
        )
        await session.commit()


@pytest.mark.asyncio
async def test_login_sets_auth_cookies(client: AsyncClient, session_factory):
    await seed_user(session_factory)

    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "seller@example.com", "password": "password123"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert "access_token" not in payload
    assert payload["user"]["email"] == "seller@example.com"
    assert response.cookies.get(ACCESS_TOKEN_COOKIE_NAME)


@pytest.mark.asyncio
async def test_logout_clears_auth_cookies(client: AsyncClient, session_factory):
    await seed_user(session_factory)

    login_response = await client.post(
        "/api/v1/auth/login",
        json={"email": "seller@example.com", "password": "password123"},
    )
    assert login_response.status_code == 200

    me_before_logout = await client.get("/api/v1/me")
    assert me_before_logout.status_code == 200

    logout_response = await client.post("/api/v1/auth/logout")
    assert logout_response.status_code == 204

    me_after_logout = await client.get("/api/v1/me")
    assert me_after_logout.status_code == 401


@pytest.mark.asyncio
async def test_me_returns_buyer_profile_shape(
    client: AsyncClient,
    session_factory: async_sessionmaker,
):
    await seed_buyer_user(session_factory)
    login_response = await client.post(
        "/api/v1/auth/login",
        json={"email": "buyer@example.com", "password": "password123"},
    )
    assert login_response.status_code == 200

    response = await client.get("/api/v1/me")
    assert response.status_code == 200
    payload = response.json()

    assert payload["role"] == "buyer"
    assert payload["seller"] is None
    assert payload["buyer"]["id"] > 0
    assert payload["buyer"]["full_name"] == "Buyer Name"
    assert payload["buyer"]["email"] == "buyer@example.com"
    assert payload["buyer"]["phone"] == "+40711111111"
    assert payload["buyer"]["address"] == "Cluj-Napoca"
    assert payload["buyer"]["preferences"]["favorite_categories"] == [
        {"category_id": 1, "category_name": "Electronics"},
        {"category_id": 2, "category_name": "Books"},
    ]
    assert payload["buyer"]["preferences"]["price_range"] == {
        "min": "50.00",
        "max": "250.00",
    }
    assert payload["buyer"]["created_at"]


@pytest.mark.asyncio
async def test_patch_me_updates_buyer_profile(
    client: AsyncClient,
    session_factory: async_sessionmaker,
):
    await seed_buyer_user(session_factory)
    login_response = await client.post(
        "/api/v1/auth/login",
        json={"email": "buyer@example.com", "password": "password123"},
    )
    assert login_response.status_code == 200

    async with session_factory() as session:
        category_c = Category(name="Home")
        session.add(category_c)
        await session.commit()
        await session.refresh(category_c)
        new_category_id = category_c.id

    response = await client.patch(
        "/api/v1/buyer/me",
        json={
            "full_name": "Updated Buyer",
            "address": "Bucharest",
            "preferences": {
                "favorite_categories": [new_category_id],
                "price_range": {"min": "100.00", "max": "600.00"},
            },
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["full_name"] == "Updated Buyer"
    assert payload["address"] == "Bucharest"
    assert payload["preferences"]["favorite_categories"] == [
        {"category_id": new_category_id, "category_name": "Home"}
    ]
    assert payload["preferences"]["price_range"] == {
        "min": "100.00",
        "max": "600.00",
    }
