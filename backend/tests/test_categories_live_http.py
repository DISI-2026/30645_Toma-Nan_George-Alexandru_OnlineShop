from __future__ import annotations

import os
from uuid import uuid4

import pytest
from httpx import AsyncClient

from application.security.tokens import create_access_token


pytestmark = pytest.mark.asyncio
CATEGORY_RESPONSE_KEYS = {
    "id",
    "name",
    "description",
    "slug",
    "product_count",
    "created_at",
    "updated_at",
}
LIST_RESPONSE_KEYS = {"items", "page", "page_size", "total"}
ERROR_RESPONSE_KEYS = {"error"}
ERROR_BODY_KEYS = {"code", "message", "details"}


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


def assert_category_response_shape(payload: dict) -> None:
    assert set(payload) == CATEGORY_RESPONSE_KEYS
    assert isinstance(payload["id"], int)
    assert isinstance(payload["name"], str)
    assert payload["description"] is None or isinstance(payload["description"], str)
    assert isinstance(payload["slug"], str)
    assert isinstance(payload["product_count"], int)
    assert isinstance(payload["created_at"], str)
    assert isinstance(payload["updated_at"], str)


def assert_error_response(payload: dict, code: str, message: str) -> None:
    assert set(payload) == ERROR_RESPONSE_KEYS
    assert set(payload["error"]) == ERROR_BODY_KEYS
    assert payload["error"]["code"] == code
    assert payload["error"]["message"] == message
    assert isinstance(payload["error"]["details"], list)


async def test_live_categories_crud_flow():
    base_url = live_base_url()
    category_name = f"Live Category {uuid4().hex[:8]}"

    async with AsyncClient(base_url=base_url, timeout=10) as client:
        create_response = await client.post(
            "/api/v1/categories",
            json={"name": category_name, "description": "Live category test"},
            cookies=admin_cookies(),
        )
        assert create_response.status_code == 201
        created = create_response.json()
        assert_category_response_shape(created)
        category_id = created["id"]
        original_slug = created["slug"]
        assert created["name"] == category_name
        assert created["product_count"] == 0

        list_response = await client.get("/api/v1/categories?page=1&page_size=100")
        assert list_response.status_code == 200
        list_payload = list_response.json()
        assert set(list_payload) == LIST_RESPONSE_KEYS
        assert isinstance(list_payload["items"], list)
        assert isinstance(list_payload["page"], int)
        assert isinstance(list_payload["page_size"], int)
        assert isinstance(list_payload["total"], int)
        listed = [item for item in list_payload["items"] if item["id"] == category_id]
        assert len(listed) == 1
        assert_category_response_shape(listed[0])

        get_response = await client.get(f"/api/v1/categories/{category_id}")
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert_category_response_shape(fetched)
        assert fetched["slug"] == original_slug

        patch_response = await client.patch(
            f"/api/v1/categories/{category_id}",
            json={"name": f"{category_name} Updated"},
            cookies=admin_cookies(),
        )
        assert patch_response.status_code == 200
        patched = patch_response.json()
        assert_category_response_shape(patched)
        assert patched["name"] == f"{category_name} Updated"
        assert patched["slug"] == original_slug

        delete_response = await client.delete(
            f"/api/v1/categories/{category_id}",
            cookies=admin_cookies(),
        )
        assert delete_response.status_code == 204

        missing_response = await client.get(f"/api/v1/categories/{category_id}")
        assert missing_response.status_code == 404
        assert_error_response(missing_response.json(), "NOT_FOUND", "Category not found.")
