from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from application.security import (
    create_password_reset_token,
    hash_password_pbkdf2,
    hash_password_reset_token,
    verify_password,
)
from models import PasswordResetToken, User, UserRole


async def seed_user(
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


@pytest.mark.asyncio
async def test_forgot_password_creates_token_and_returns_success(
    client: AsyncClient,
    session_factory: async_sessionmaker,
):
    user = await seed_user(
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
        statement = select(PasswordResetToken).where(PasswordResetToken.user_id == user.id)
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
    user = await seed_user(
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
    user = await seed_user(
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
    assert (
        payload["error"]["message"]
        == "Password doesnt match minimum requirements."
    )
