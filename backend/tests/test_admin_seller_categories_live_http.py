from __future__ import annotations

import os
from uuid import uuid4

import pytest
from httpx import AsyncClient

from application.security.tokens import create_access_token


pytestmark = pytest.mark.asyncio


def live_base_url() -> str:
    url = os.getenv("LIVE_BACKEND_URL")
    if not url:
        pytest.skip("Set LIVE_BACKEND_URL=http://localhost:8000 to run live HTTP tests.")
    return url.rstrip("/")


def admin_cookies() -> dict[str, str]:
    token = create_access_token(
        user_id=1,
        role="admin",
        secret_key=os.getenv("LIVE_AUTH_SECRET_KEY", "change-this-in-production"),
        expires_in_minutes=60,
    )
    return {"access_token": token}


def seller_cookies(user_id: int) -> dict[str, str]:
    token = create_access_token(
        user_id=user_id,
        role="seller",
        secret_key=os.getenv("LIVE_AUTH_SECRET_KEY", "change-this-in-production"),
        expires_in_minutes=60,
    )
    return {"access_token": token}


async def test_live_admin_seller_category_assignment_flow():
    suffix = uuid4().hex[:8]
    base_url = live_base_url()

    async with AsyncClient(base_url=base_url, timeout=15) as client:
        category_response = await client.post(
            "/api/v1/categories",
            json={
                "name": f"Live Seller Category {suffix}",
                "description": "Live seller category assignment test",
            },
            cookies=admin_cookies(),
        )
        assert category_response.status_code == 201
        category = category_response.json()
        category_id = category["id"]

        seller_email = f"live-seller-{suffix}@test.com"
        register_response = await client.post(
            "/api/v1/auth/register",
            json={
                "role": "seller",
                "email": seller_email,
                "password": "Password123!",
                "company_name": f"Live Seller {suffix}",
                "description": "Live seller for assignment tests",
            },
        )
        assert register_response.status_code == 201
        seller_user_id = register_response.json()["user"]["id"]

        profile_response = await client.get(
            "/api/v1/sellers/me",
            cookies=seller_cookies(seller_user_id),
        )
        assert profile_response.status_code == 200
        seller_id = profile_response.json()["id"]

        assign_response = await client.post(
            f"/api/v1/admin/sellers/{seller_id}/categories",
            json={"category_id": category_id},
            cookies=admin_cookies(),
        )
        assert assign_response.status_code == 201
        assignment = assign_response.json()
        assert assignment["seller_id"] == seller_id
        assert assignment["category_id"] == category_id
        assert assignment["assigned_at"]

        list_response = await client.get(
            f"/api/v1/admin/sellers?category_id={category_id}",
            cookies=admin_cookies(),
        )
        assert list_response.status_code == 200
        sellers = list_response.json()["items"]
        listed = [seller for seller in sellers if seller["seller_id"] == seller_id]
        assert len(listed) == 1
        assert listed[0]["categories"][0]["id"] == category_id

        product_response = await client.post(
            "/api/v1/sellers/me/products",
            data={
                "title": f"Live Product {suffix}",
                "description": "Live product proves category assignment.",
                "price": "25.00",
                "stock": "2",
                "category_id": str(category_id),
            },
            cookies=seller_cookies(seller_user_id),
        )
        assert product_response.status_code == 201

        blocked_delete = await client.delete(
            f"/api/v1/admin/sellers/{seller_id}/categories/{category_id}",
            cookies=admin_cookies(),
        )
        assert blocked_delete.status_code == 422
        assert blocked_delete.json()["error"]["code"] == "UNPROCESSABLE_ENTITY"
