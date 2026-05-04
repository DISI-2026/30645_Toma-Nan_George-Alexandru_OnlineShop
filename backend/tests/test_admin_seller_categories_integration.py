from __future__ import annotations

from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from application.security.tokens import create_access_token
from models import Category, Product, Seller, User, UserRole
from models.seller_category import seller_categories


ERROR_RESPONSE_KEYS = {"error"}
ERROR_BODY_KEYS = {"code", "message", "details"}


def auth_cookies(role: str = "admin", user_id: int = 1) -> dict[str, str]:
    token = create_access_token(
        user_id=user_id,
        role=role,
        secret_key="test-secret",
        expires_in_minutes=60,
    )
    return {"access_token": token}


def assert_error_response(payload: dict, code: str, message: str | None = None) -> None:
    assert set(payload) == ERROR_RESPONSE_KEYS
    assert set(payload["error"]) == ERROR_BODY_KEYS
    assert payload["error"]["code"] == code
    if message is not None:
        assert payload["error"]["message"] == message


async def seed_seller_and_categories(
    session_factory: async_sessionmaker[AsyncSession],
) -> dict[str, int]:
    async with session_factory() as session:
        user = User(
            email="admin-seller-categories@test.com",
            password_hash="hash",
            role=UserRole.SELLER,
        )
        session.add(user)
        await session.flush()

        seller = Seller(user_id=user.id, company_name="Assigned Seller")
        session.add(seller)
        electronics = Category(name="Assigned Electronics")
        books = Category(name="Assigned Books")
        session.add_all([electronics, books])
        await session.commit()
        return {
            "user_id": user.id,
            "seller_id": seller.id,
            "electronics_id": electronics.id,
            "books_id": books.id,
        }


@pytest.mark.asyncio
async def test_admin_can_assign_category_to_seller(
    client: AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
):
    seeded = await seed_seller_and_categories(session_factory)

    response = await client.post(
        f"/api/v1/admin/sellers/{seeded['seller_id']}/categories",
        json={"category_id": seeded["electronics_id"]},
        cookies=auth_cookies(),
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["seller_id"] == seeded["seller_id"]
    assert payload["category_id"] == seeded["electronics_id"]
    assert isinstance(payload["assigned_at"], str)

    async with session_factory() as session:
        result = await session.execute(
            select(seller_categories).where(
                seller_categories.c.seller_id == seeded["seller_id"],
                seller_categories.c.category_id == seeded["electronics_id"],
            )
        )
        row = result.first()
        assert row is not None
        assert row.assigned_at is not None


@pytest.mark.asyncio
async def test_duplicate_assignment_returns_409(
    client: AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
):
    seeded = await seed_seller_and_categories(session_factory)
    url = f"/api/v1/admin/sellers/{seeded['seller_id']}/categories"

    first = await client.post(
        url,
        json={"category_id": seeded["electronics_id"]},
        cookies=auth_cookies(),
    )
    assert first.status_code == 201

    second = await client.post(
        url,
        json={"category_id": seeded["electronics_id"]},
        cookies=auth_cookies(),
    )

    assert second.status_code == 409
    assert_error_response(
        second.json(),
        "CONFLICT",
        "Seller is already assigned to this category.",
    )


@pytest.mark.asyncio
async def test_missing_seller_or_category_returns_404(
    client: AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
):
    seeded = await seed_seller_and_categories(session_factory)

    missing_seller = await client.post(
        "/api/v1/admin/sellers/999999/categories",
        json={"category_id": seeded["electronics_id"]},
        cookies=auth_cookies(),
    )
    assert missing_seller.status_code == 404
    assert_error_response(missing_seller.json(), "NOT_FOUND", "Seller not found.")

    missing_category = await client.post(
        f"/api/v1/admin/sellers/{seeded['seller_id']}/categories",
        json={"category_id": 999999},
        cookies=auth_cookies(),
    )
    assert missing_category.status_code == 404
    assert_error_response(missing_category.json(), "NOT_FOUND", "Category not found.")


@pytest.mark.asyncio
async def test_non_admin_cannot_manage_seller_categories(
    client: AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
):
    seeded = await seed_seller_and_categories(session_factory)

    post_response = await client.post(
        f"/api/v1/admin/sellers/{seeded['seller_id']}/categories",
        json={"category_id": seeded["electronics_id"]},
        cookies=auth_cookies("seller"),
    )
    assert post_response.status_code == 403
    assert_error_response(post_response.json(), "FORBIDDEN", "Insufficient permissions.")

    list_response = await client.get(
        "/api/v1/admin/sellers",
        cookies=auth_cookies("buyer"),
    )
    assert list_response.status_code == 403


@pytest.mark.asyncio
async def test_list_sellers_returns_assignments_and_category_filter(
    client: AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
):
    seeded = await seed_seller_and_categories(session_factory)
    await client.post(
        f"/api/v1/admin/sellers/{seeded['seller_id']}/categories",
        json={"category_id": seeded["electronics_id"]},
        cookies=auth_cookies(),
    )

    response = await client.get(
        "/api/v1/admin/sellers?page=1&page_size=10",
        cookies=auth_cookies(),
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["page"] == 1
    assert payload["page_size"] == 10
    assert payload["total"] >= 1
    seller = next(
        item for item in payload["items"] if item["seller_id"] == seeded["seller_id"]
    )
    assert seller["company_name"] == "Assigned Seller"
    assert seller["categories"][0]["id"] == seeded["electronics_id"]
    assert seller["categories"][0]["name"] == "Assigned Electronics"
    assert seller["categories"][0]["slug"] == "assigned-electronics"
    assert isinstance(seller["categories"][0]["assigned_at"], str)

    filtered = await client.get(
        f"/api/v1/admin/sellers?category_id={seeded['electronics_id']}",
        cookies=auth_cookies(),
    )
    assert filtered.status_code == 200
    assert [item["seller_id"] for item in filtered.json()["items"]] == [
        seeded["seller_id"]
    ]

    empty = await client.get(
        f"/api/v1/admin/sellers?category_id={seeded['books_id']}",
        cookies=auth_cookies(),
    )
    assert empty.status_code == 200
    assert empty.json()["items"] == []
    assert empty.json()["total"] == 0


@pytest.mark.asyncio
async def test_delete_assignment_removes_it_and_missing_delete_returns_404(
    client: AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
):
    seeded = await seed_seller_and_categories(session_factory)
    url = (
        f"/api/v1/admin/sellers/{seeded['seller_id']}"
        f"/categories/{seeded['electronics_id']}"
    )
    await client.post(
        f"/api/v1/admin/sellers/{seeded['seller_id']}/categories",
        json={"category_id": seeded["electronics_id"]},
        cookies=auth_cookies(),
    )

    delete_response = await client.delete(url, cookies=auth_cookies())
    assert delete_response.status_code == 204
    assert delete_response.content == b""

    second_delete = await client.delete(url, cookies=auth_cookies())
    assert second_delete.status_code == 404
    assert_error_response(
        second_delete.json(),
        "NOT_FOUND",
        "Seller category assignment not found.",
    )


@pytest.mark.asyncio
async def test_delete_assignment_blocked_when_active_product_exists(
    client: AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
):
    seeded = await seed_seller_and_categories(session_factory)
    await client.post(
        f"/api/v1/admin/sellers/{seeded['seller_id']}/categories",
        json={"category_id": seeded["electronics_id"]},
        cookies=auth_cookies(),
    )

    async with session_factory() as session:
        session.add(
            Product(
                seller_id=seeded["seller_id"],
                category_id=seeded["electronics_id"],
                title="Active Blocker",
                slug="active-blocker",
                price=Decimal("100.00"),
                stock=1,
                is_available=True,
            )
        )
        await session.commit()

    response = await client.delete(
        f"/api/v1/admin/sellers/{seeded['seller_id']}/categories/{seeded['electronics_id']}",
        cookies=auth_cookies(),
    )

    assert response.status_code == 422
    assert_error_response(
        response.json(),
        "UNPROCESSABLE_ENTITY",
        "Seller category assignment cannot be removed while active products exist in this category.",
    )


@pytest.mark.asyncio
async def test_seller_can_create_product_only_after_category_assignment(
    client: AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
):
    seeded = await seed_seller_and_categories(session_factory)
    seller_cookies = auth_cookies("seller", seeded["user_id"])
    create_payload = {
        "title": "Assignment Product",
        "description": "Product needs assigned category.",
        "price": "10.00",
        "stock": "3",
        "category_id": str(seeded["electronics_id"]),
    }

    forbidden = await client.post(
        "/api/v1/sellers/me/products",
        data=create_payload,
        cookies=seller_cookies,
    )
    assert forbidden.status_code == 403

    assign_response = await client.post(
        f"/api/v1/admin/sellers/{seeded['seller_id']}/categories",
        json={"category_id": seeded["electronics_id"]},
        cookies=auth_cookies(),
    )
    assert assign_response.status_code == 201

    created = await client.post(
        "/api/v1/sellers/me/products",
        data=create_payload,
        cookies=seller_cookies,
    )
    assert created.status_code == 201
    assert created.json()["category_id"] == seeded["electronics_id"]
