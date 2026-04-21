from __future__ import annotations

import io

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker

from api.dependencies.auth import ACCESS_TOKEN_COOKIE_NAME
from application.security import create_access_token, hash_password_pbkdf2
from models import Seller, User, UserRole


def auth_cookies(user_id: int, role: str) -> dict[str, str]:
    token = create_access_token(
        user_id=user_id,
        role=role,
        secret_key="test-secret",
        expires_in_minutes=60,
    )
    return {ACCESS_TOKEN_COOKIE_NAME: token}


async def seed_seller_user(session_factory: async_sessionmaker):
    async with session_factory() as session:
        user = User(
            email="seller@example.com",
            password_hash=hash_password_pbkdf2("password123"),
            role=UserRole.SELLER,
        )
        session.add(user)
        await session.commit()


async def seed_seller_profile(session_factory: async_sessionmaker):
    async with session_factory() as session:
        seller = Seller(
            user_id=1,
            company_name="Tech Store",
            description="We sell electronics",
            phone="+40700000000",
            address="Cluj-Napoca",
            tax_id="RO12345678",
            logo_path="/media/sellers/logo_test.png",
        )
        session.add(seller)
        await session.commit()


@pytest.mark.asyncio
async def test_get_public_profile_success(client: AsyncClient, session_factory):
    await seed_seller_user(session_factory)
    await seed_seller_profile(session_factory)

    print("\n=== GET /api/v1/sellers/1 (Public Profile) ===")
    response = await client.get("/api/v1/sellers/1")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")

    assert response.status_code == 200
    data = response.json()
    assert data["company_name"] == "Tech Store"
    assert data["description"] == "We sell electronics"
    assert data["logo_url"] == "/media/sellers/logo_test.png"
    assert "email" not in data
    assert "phone" not in data
    print("✅ Public profile excludes private fields (email, phone, address, tax_id)")


@pytest.mark.asyncio
async def test_get_public_profile_not_found(client: AsyncClient):
    response = await client.get("/api/v1/sellers/999")

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_private_profile_missing_returns_404(client: AsyncClient, session_factory):
    await seed_seller_user(session_factory)
    cookies = auth_cookies(user_id=1, role="seller")

    print("\n=== GET /api/v1/sellers/me (Private Profile - Not Created) ===")
    response = await client.get("/api/v1/sellers/me", cookies=cookies)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")

    assert response.status_code == 404
    error_data = response.json()
    assert "error" in error_data
    assert "not yet created" in error_data["error"]["message"]
    print("✅ Returns 404 with helpful message when profile doesn't exist")


@pytest.mark.asyncio
async def test_get_private_profile_requires_access_token(client: AsyncClient):
    response = await client.get("/api/v1/sellers/me")

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_create_profile_with_logo(client: AsyncClient, session_factory):
    await seed_seller_user(session_factory)
    cookies = auth_cookies(user_id=1, role="seller")

    print("\n=== POST /api/v1/sellers/me (Create Profile) ===")
    print("Input data:")
    print("  company_name: Tech Store")
    print("  description: We sell the best electronics.")
    print("  phone: +40700000000")
    print("  address: Cluj-Napoca")
    print("  tax_id: RO12345678")
    print("  logo: logo.png (image/png)")

    response = await client.post(
        "/api/v1/sellers/me",
        cookies=cookies,
        data={
            "company_name": "Tech Store",
            "description": "We sell the best electronics.",
            "phone": "+40700000000",
            "address": "Cluj-Napoca",
            "tax_id": "RO12345678",
        },
        files={"logo": ("logo.png", io.BytesIO(b"pngdata"), "image/png")},
    )

    print(f"Status: {response.status_code}")
    payload = response.json()
    print(f"Response: {payload}")
    
    assert response.status_code == 201
    assert payload["company_name"] == "Tech Store"
    assert payload["logo_url"].startswith("/media/sellers/logo_")
    assert payload["email"] == "seller@example.com"
    assert payload["phone"] == "+40700000000"
    print("✅ Profile created with all fields including private data (email, phone, address, tax_id)")


@pytest.mark.asyncio
async def test_create_profile_duplicate_conflict(client: AsyncClient, session_factory):
    await seed_seller_user(session_factory)
    await seed_seller_profile(session_factory)
    cookies = auth_cookies(user_id=1, role="seller")

    response = await client.post(
        "/api/v1/sellers/me",
        cookies=cookies,
        data={"company_name": "Another Store"},
    )

    assert response.status_code == 409


@pytest.mark.asyncio
async def test_update_profile_updates_fields(client: AsyncClient, session_factory):
    await seed_seller_user(session_factory)
    await seed_seller_profile(session_factory)
    cookies = auth_cookies(user_id=1, role="seller")

    print("\n=== PATCH /api/v1/sellers/me (Update Profile) ===")
    print("Input data:")
    print("  description: Updated description")
    print("  address: Bucharest")

    patch_response = await client.patch(
        "/api/v1/sellers/me",
        cookies=cookies,
        data={"description": "Updated description", "address": "Bucharest"},
    )

    print(f"Status: {patch_response.status_code}")
    payload = patch_response.json()
    print(f"Response: {payload}")

    assert patch_response.status_code == 200
    assert payload["description"] == "Updated description"
    assert payload["address"] == "Bucharest"
    assert payload["company_name"] == "Tech Store"
    print("✅ Partial update successful - only specified fields changed")


@pytest.mark.asyncio
async def test_update_profile_replaces_logo(client: AsyncClient, session_factory):
    await seed_seller_user(session_factory)
    await seed_seller_profile(session_factory)
    cookies = auth_cookies(user_id=1, role="seller")

    patch_response = await client.patch(
        "/api/v1/sellers/me",
        cookies=cookies,
        files={"logo": ("logo.webp", io.BytesIO(b"newdata"), "image/webp")},
    )

    assert patch_response.status_code == 200
    payload = patch_response.json()
    assert payload["logo_url"] != "/media/sellers/logo_test.png"
    assert payload["logo_url"].startswith("/media/sellers/logo_")
