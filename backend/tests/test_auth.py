from __future__ import annotations

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker

from api.dependencies.auth import (
    ACCESS_TOKEN_COOKIE_NAME,
)
from application.security import hash_password_pbkdf2
from models import User, UserRole


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
