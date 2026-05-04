from __future__ import annotations

from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from application.security.tokens import create_access_token
from models import Category, Product, Seller, User, UserRole
from models.seller_category import seller_categories


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


def auth_cookies(role: str = "admin", user_id: int = 1) -> dict[str, str]:
    token = create_access_token(
        user_id=user_id,
        role=role,
        secret_key="test-secret",
        expires_in_minutes=60,
    )
    return {"access_token": token}


async def seed_seller(session: AsyncSession) -> Seller:
    user = User(
        email="seller.categories@test.com",
        password_hash="hash",
        role=UserRole.SELLER,
    )
    session.add(user)
    await session.flush()
    seller = Seller(user_id=user.id, company_name="Category Seller")
    session.add(seller)
    await session.flush()
    return seller


def assert_category_response_shape(payload: dict) -> None:
    assert set(payload) == CATEGORY_RESPONSE_KEYS
    assert isinstance(payload["id"], int)
    assert isinstance(payload["name"], str)
    assert payload["description"] is None or isinstance(payload["description"], str)
    assert isinstance(payload["slug"], str)
    assert isinstance(payload["product_count"], int)
    assert isinstance(payload["created_at"], str)
    assert isinstance(payload["updated_at"], str)


def assert_error_response(payload: dict, code: str, message: str | None = None) -> None:
    assert set(payload) == ERROR_RESPONSE_KEYS
    assert set(payload["error"]) == ERROR_BODY_KEYS
    assert payload["error"]["code"] == code
    assert isinstance(payload["error"]["message"], str)
    assert isinstance(payload["error"]["details"], list)
    if message is not None:
        assert payload["error"]["message"] == message


@pytest.mark.asyncio
async def test_admin_can_create_category_with_generated_slug(client: AsyncClient):
    response = await client.post(
        "/api/v1/categories",
        json={"name": "Gaming Laptops", "description": "Portable gaming devices"},
        cookies=auth_cookies(),
    )

    assert response.status_code == 201
    payload = response.json()
    assert_category_response_shape(payload)
    assert payload["name"] == "Gaming Laptops"
    assert payload["description"] == "Portable gaming devices"
    assert payload["slug"] == "gaming-laptops"
    assert payload["product_count"] == 0
    assert payload["created_at"]
    assert payload["updated_at"]


@pytest.mark.asyncio
async def test_non_admin_cannot_mutate_categories(client: AsyncClient):
    create_response = await client.post(
        "/api/v1/categories",
        json={"name": "Forbidden Category"},
        cookies=auth_cookies("seller"),
    )
    assert create_response.status_code == 403
    assert_error_response(
        create_response.json(),
        "FORBIDDEN",
        "Insufficient permissions.",
    )

    update_response = await client.patch(
        "/api/v1/categories/1",
        json={"name": "Still Forbidden"},
        cookies=auth_cookies("buyer"),
    )
    assert update_response.status_code == 403
    assert_error_response(
        update_response.json(),
        "FORBIDDEN",
        "Insufficient permissions.",
    )

    delete_response = await client.delete(
        "/api/v1/categories/1",
        cookies=auth_cookies("seller"),
    )
    assert delete_response.status_code == 403
    assert_error_response(
        delete_response.json(),
        "FORBIDDEN",
        "Insufficient permissions.",
    )


@pytest.mark.asyncio
async def test_missing_auth_token_returns_frontend_error_contract(client: AsyncClient):
    response = await client.post(
        "/api/v1/categories",
        json={"name": "Missing Auth"},
    )

    assert response.status_code == 401
    assert_error_response(response.json(), "UNAUTHORIZED", "Missing access token.")


@pytest.mark.asyncio
async def test_list_categories_returns_pagination_and_active_product_count(
    client: AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
):
    async with session_factory() as session:
        seller = await seed_seller(session)
        active_category = Category(name="Electronics")
        inactive_category = Category(name="Books")
        session.add_all([active_category, inactive_category])
        await session.flush()
        session.add_all(
            [
                Product(
                    seller_id=seller.id,
                    category_id=active_category.id,
                    title="Available Phone",
                    slug="available-phone",
                    price=Decimal("999.99"),
                    stock=3,
                    is_available=True,
                ),
                Product(
                    seller_id=seller.id,
                    category_id=active_category.id,
                    title="Unavailable Phone",
                    slug="unavailable-phone",
                    price=Decimal("499.99"),
                    stock=4,
                    is_available=False,
                ),
                Product(
                    seller_id=seller.id,
                    category_id=active_category.id,
                    title="Out of Stock Phone",
                    slug="out-of-stock-phone",
                    price=Decimal("399.99"),
                    stock=0,
                    is_available=True,
                ),
            ]
        )
        await session.commit()

    response = await client.get("/api/v1/categories?page=1&page_size=10")

    assert response.status_code == 200
    payload = response.json()
    assert set(payload) == LIST_RESPONSE_KEYS
    assert isinstance(payload["items"], list)
    assert payload["page"] == 1
    assert payload["page_size"] == 10
    assert payload["total"] == 2
    categories = {item["name"]: item for item in payload["items"]}
    for category in categories.values():
        assert_category_response_shape(category)
    assert categories["Electronics"]["product_count"] == 1
    assert categories["Books"]["product_count"] == 0


@pytest.mark.asyncio
async def test_get_category_by_id_returns_expected_payload(
    client: AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
):
    async with session_factory() as session:
        category = Category(name="Home Decor", description="Useful home items")
        session.add(category)
        await session.commit()
        await session.refresh(category)
        category_id = category.id

    response = await client.get(f"/api/v1/categories/{category_id}")

    assert response.status_code == 200
    payload = response.json()
    assert_category_response_shape(payload)
    assert payload["id"] == category_id
    assert payload["name"] == "Home Decor"
    assert payload["description"] == "Useful home items"
    assert payload["slug"] == "home-decor"
    assert payload["product_count"] == 0


@pytest.mark.asyncio
async def test_duplicate_category_name_returns_conflict(client: AsyncClient):
    first = await client.post(
        "/api/v1/categories",
        json={"name": "Toys"},
        cookies=auth_cookies(),
    )
    assert first.status_code == 201

    second = await client.post(
        "/api/v1/categories",
        json={"name": "Toys"},
        cookies=auth_cookies(),
    )

    assert second.status_code == 409
    assert_error_response(
        second.json(),
        "CONFLICT",
        "Category with this name or slug already exists.",
    )


@pytest.mark.asyncio
async def test_invalid_create_payload_returns_validation_contract(client: AsyncClient):
    response = await client.post(
        "/api/v1/categories",
        json={"name": ""},
        cookies=auth_cookies(),
    )

    assert response.status_code == 400
    payload = response.json()
    assert_error_response(payload, "VALIDATION_ERROR", "Request validation failed.")
    assert payload["error"]["details"]
    assert payload["error"]["details"][0]["field"] == "name"


@pytest.mark.asyncio
async def test_put_and_patch_update_category_without_changing_slug(
    client: AsyncClient,
):
    create_response = await client.post(
        "/api/v1/categories",
        json={"name": "Old Category", "description": "Old description"},
        cookies=auth_cookies(),
    )
    assert create_response.status_code == 201
    category_id = create_response.json()["id"]
    original_slug = create_response.json()["slug"]

    put_response = await client.put(
        f"/api/v1/categories/{category_id}",
        json={"name": "New Category", "description": "New description"},
        cookies=auth_cookies(),
    )
    assert put_response.status_code == 200
    put_payload = put_response.json()
    assert_category_response_shape(put_payload)
    assert put_payload["name"] == "New Category"
    assert put_payload["description"] == "New description"
    assert put_payload["slug"] == original_slug

    patch_response = await client.patch(
        f"/api/v1/categories/{category_id}",
        json={"description": None},
        cookies=auth_cookies(),
    )
    assert patch_response.status_code == 200
    patch_payload = patch_response.json()
    assert_category_response_shape(patch_payload)
    assert patch_payload["name"] == "New Category"
    assert patch_payload["description"] is None
    assert patch_payload["slug"] == original_slug


@pytest.mark.asyncio
async def test_delete_empty_category_removes_it(client: AsyncClient):
    create_response = await client.post(
        "/api/v1/categories",
        json={"name": "Temporary Category"},
        cookies=auth_cookies(),
    )
    assert create_response.status_code == 201
    category_id = create_response.json()["id"]

    delete_response = await client.delete(
        f"/api/v1/categories/{category_id}",
        cookies=auth_cookies(),
    )
    assert delete_response.status_code == 204
    assert delete_response.content == b""

    get_response = await client.get(f"/api/v1/categories/{category_id}")
    assert get_response.status_code == 404
    assert_error_response(get_response.json(), "NOT_FOUND", "Category not found.")


@pytest.mark.asyncio
async def test_delete_category_with_available_product_returns_422(
    client: AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
):
    async with session_factory() as session:
        seller = await seed_seller(session)
        category = Category(name="Blocked Products")
        session.add(category)
        await session.flush()
        session.add(
            Product(
                seller_id=seller.id,
                category_id=category.id,
                title="Active Product",
                slug="active-product",
                price=Decimal("10.00"),
                stock=1,
                is_available=True,
            )
        )
        await session.commit()
        category_id = category.id

    response = await client.delete(
        f"/api/v1/categories/{category_id}",
        cookies=auth_cookies(),
    )

    assert response.status_code == 422
    assert_error_response(
        response.json(),
        "UNPROCESSABLE_ENTITY",
        "Category cannot be deleted while active products or seller associations exist.",
    )


@pytest.mark.asyncio
async def test_delete_category_with_seller_association_returns_422(
    client: AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
):
    async with session_factory() as session:
        seller = await seed_seller(session)
        category = Category(name="Blocked Sellers")
        session.add(category)
        await session.flush()
        await session.execute(
            seller_categories.insert().values(
                seller_id=seller.id,
                category_id=category.id,
            )
        )
        await session.commit()
        category_id = category.id

    response = await client.delete(
        f"/api/v1/categories/{category_id}",
        cookies=auth_cookies(),
    )

    assert response.status_code == 422
    assert_error_response(
        response.json(),
        "UNPROCESSABLE_ENTITY",
        "Category cannot be deleted while active products or seller associations exist.",
    )
