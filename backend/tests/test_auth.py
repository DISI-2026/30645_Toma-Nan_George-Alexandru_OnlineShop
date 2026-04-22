from __future__ import annotations

from decimal import Decimal
from datetime import UTC, datetime, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from api.dependencies.auth import ACCESS_TOKEN_COOKIE_NAME
from application.security import (
    create_access_token,
    create_password_reset_token,
    hash_password_pbkdf2,
    hash_password_reset_token,
    verify_password,
)
from models import Buyer, Category, PasswordResetToken, User, UserRole


async def seed_password_reset_user(
    session_factory: async_sessionmaker,
    *,
    email: str,
    password: str,
    role: UserRole = UserRole.BUYER,
) -> User:
    async with session_factory() as session:
        user = User(
            email=email,
            password_hash=hash_password_pbkdf2(password),
            role=role,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user


async def seed_auth_cookie_user(session_factory: async_sessionmaker) -> None:
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
async def test_forgot_password_creates_token_and_returns_success(
    client: AsyncClient,
    session_factory: async_sessionmaker,
):
    user = await seed_password_reset_user(
        session_factory,
        email="buyer.test@example.com",
        password="Buyer123!",
    )

    response = await client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "buyer.test@example.com"},
    )

    assert response.status_code == 200
    assert response.json() == {"message": "Email trimis cu succes"}

    async with session_factory() as session:
        statement = select(PasswordResetToken).where(
            PasswordResetToken.user_id == user.id
        )
        token_entry = (await session.execute(statement)).scalar_one_or_none()
        assert token_entry is not None
        assert token_entry.used_at is None
        expires_at = token_entry.expires_at
        now = (
            datetime.now(UTC).replace(tzinfo=None)
            if expires_at.tzinfo is None
            else datetime.now(UTC)
        )
        assert expires_at > now
        assert len(token_entry.token_hash) == 64


@pytest.mark.asyncio
async def test_reset_password_success(
    client: AsyncClient,
    session_factory: async_sessionmaker,
):
    user = await seed_password_reset_user(
        session_factory,
        email="buyer.test@example.com",
        password="OldPass123!",
    )
    raw_token = create_password_reset_token()

    async with session_factory() as session:
        session.add(
            PasswordResetToken(
                user_id=user.id,
                token_hash=hash_password_reset_token(raw_token),
                expires_at=datetime.now(UTC) + timedelta(minutes=30),
            )
        )
        await session.commit()

    response = await client.post(
        "/api/v1/auth/reset-password",
        json={"token": raw_token, "new_password": "NewPass123!"},
    )

    assert response.status_code == 200
    assert response.json() == {"message": "Parola a fost resetată cu succes"}

    async with session_factory() as session:
        refreshed_user = (
            await session.execute(select(User).where(User.id == user.id))
        ).scalar_one()
        token_entry = (
            await session.execute(
                select(PasswordResetToken).where(PasswordResetToken.user_id == user.id)
            )
        ).scalar_one()
        assert verify_password("NewPass123!", refreshed_user.password_hash)
        assert token_entry.used_at is not None


@pytest.mark.asyncio
async def test_reset_password_invalid_or_expired_token(
    client: AsyncClient,
):
    response = await client.post(
        "/api/v1/auth/reset-password",
        json={"token": "invalid-token", "new_password": "NewPass123!"},
    )

    assert response.status_code == 400
    payload = response.json()
    assert payload["error"]["message"] == "Invalid or expired token."


@pytest.mark.asyncio
async def test_reset_password_rejects_weak_password(
    client: AsyncClient,
    session_factory: async_sessionmaker,
):
    user = await seed_password_reset_user(
        session_factory,
        email="buyer.test@example.com",
        password="OldPass123!",
    )
    raw_token = create_password_reset_token()

    async with session_factory() as session:
        session.add(
            PasswordResetToken(
                user_id=user.id,
                token_hash=hash_password_reset_token(raw_token),
                expires_at=datetime.now(UTC) + timedelta(minutes=30),
            )
        )
        await session.commit()

    response = await client.post(
        "/api/v1/auth/reset-password",
        json={"token": raw_token, "new_password": "weakpass"},
    )

    assert response.status_code == 400
    payload = response.json()
    assert payload["error"]["message"] == "Password doesnt match minimum requirements."


@pytest.mark.asyncio
async def test_login_sets_auth_cookies(client: AsyncClient, session_factory):
    await seed_auth_cookie_user(session_factory)

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
    await seed_auth_cookie_user(session_factory)

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
            "phone": "+40722222222",
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
    assert payload["phone"] == "+40722222222"
    assert payload["address"] == "Bucharest"
    assert payload["preferences"]["favorite_categories"] == [
        {"category_id": new_category_id, "category_name": "Home"}
    ]
    assert payload["preferences"]["price_range"] == {
        "min": "100.00",
        "max": "600.00",
    }


@pytest.mark.asyncio
async def test_patch_me_allows_partial_update_for_phone_only(
    client: AsyncClient,
    session_factory: async_sessionmaker,
):
    await seed_buyer_user(session_factory)
    login_response = await client.post(
        "/api/v1/auth/login",
        json={"email": "buyer@example.com", "password": "password123"},
    )
    assert login_response.status_code == 200

    response = await client.patch(
        "/api/v1/buyer/me",
        json={"phone": "+40733333333"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["full_name"] == "Buyer Name"
    assert payload["phone"] == "+40733333333"
    assert payload["address"] == "Cluj-Napoca"
    assert payload["preferences"]["price_range"] == {
        "min": "50.00",
        "max": "250.00",
    }


@pytest.mark.asyncio
async def test_me_accepts_bearer_token_header(
    client: AsyncClient,
    session_factory: async_sessionmaker,
):
    await seed_auth_cookie_user(session_factory)
    token = create_access_token(
        user_id=1,
        role="seller",
        secret_key="test-secret",
        expires_in_minutes=60,
    )

    response = await client.get(
        "/api/v1/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["email"] == "seller@example.com"
    assert payload["role"] == "seller"


@pytest.mark.asyncio
async def test_bearer_token_takes_precedence_over_invalid_cookie(
    client: AsyncClient,
    session_factory: async_sessionmaker,
):
    await seed_auth_cookie_user(session_factory)
    token = create_access_token(
        user_id=1,
        role="seller",
        secret_key="test-secret",
        expires_in_minutes=60,
    )

    client.cookies.set(ACCESS_TOKEN_COOKIE_NAME, "stale.invalid.token")
    response = await client.get(
        "/api/v1/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["email"] == "seller@example.com"
