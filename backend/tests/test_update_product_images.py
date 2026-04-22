from __future__ import annotations

from decimal import Decimal

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from application.security.tokens import create_access_token
from models import Category, Product, ProductImage, Seller, User, UserRole
from models.seller_category import seller_categories


def get_error_message(response_data: dict) -> str:
    if "detail" in response_data:
        return str(response_data["detail"])
    if "error" in response_data:
        error = response_data["error"]
        if isinstance(error, dict):
            return str(error.get("message", error))
        return str(error)
    return str(response_data)


def auth_cookies(user_id: int, role: str) -> dict[str, str]:
    token = create_access_token(
        user_id=user_id,
        role=role,
        secret_key="test-secret",
        expires_in_minutes=60,
    )
    return {"access_token": token}


@pytest_asyncio.fixture
async def image_patch_seed(session_factory: async_sessionmaker[AsyncSession]):
    async with session_factory() as session:
        user1 = User(email="seller1-images@test.com", password_hash="hash", role=UserRole.SELLER)
        user2 = User(email="seller2-images@test.com", password_hash="hash", role=UserRole.SELLER)
        session.add_all([user1, user2])
        await session.flush()

        seller1 = Seller(user_id=user1.id, company_name="Seller 1")
        seller2 = Seller(user_id=user2.id, company_name="Seller 2")
        session.add_all([seller1, seller2])
        await session.flush()

        category = Category(name="Electronics")
        session.add(category)
        await session.flush()

        await session.execute(
            seller_categories.insert().values([
                {"seller_id": seller1.id, "category_id": category.id},
                {"seller_id": seller2.id, "category_id": category.id},
            ])
        )

        product = Product(
            seller_id=seller1.id,
            category_id=category.id,
            title="Main Product",
            slug="main-product",
            description="Main product description",
            price=Decimal("199.99"),
            stock=10,
        )
        another_product_same_seller = Product(
            seller_id=seller1.id,
            category_id=category.id,
            title="Sibling Product",
            slug="sibling-product",
            description="Sibling product description",
            price=Decimal("99.99"),
            stock=5,
        )
        seller2_product = Product(
            seller_id=seller2.id,
            category_id=category.id,
            title="Seller Two Product",
            slug="seller-two-product",
            description="Seller two product description",
            price=Decimal("299.99"),
            stock=8,
        )
        session.add_all([product, another_product_same_seller, seller2_product])
        await session.flush()

        product_images = [
            ProductImage(product_id=product.id, path="products/1/first.jpg", is_thumbnail=True, display_order=0),
            ProductImage(product_id=product.id, path="products/1/second.jpg", is_thumbnail=False, display_order=1),
            ProductImage(product_id=product.id, path="products/1/third.jpg", is_thumbnail=False, display_order=2),
        ]
        sibling_image = ProductImage(
            product_id=another_product_same_seller.id,
            path="products/2/other.jpg",
            is_thumbnail=True,
            display_order=0,
        )
        seller2_image = ProductImage(
            product_id=seller2_product.id,
            path="products/3/other-seller.jpg",
            is_thumbnail=True,
            display_order=0,
        )
        session.add_all([*product_images, sibling_image, seller2_image])
        await session.commit()

        return {
            "seller1_cookies": auth_cookies(user1.id, "seller"),
            "seller2_cookies": auth_cookies(user2.id, "seller"),
            "product_id": product.id,
            "image_ids": [image.id for image in product_images],
            "sibling_image_id": sibling_image.id,
            "seller2_product_id": seller2_product.id,
        }


@pytest.mark.asyncio
async def test_update_product_images_reorder_and_change_thumbnail_success(
    client: AsyncClient,
    image_patch_seed,
):
    image1, image2, image3 = image_patch_seed["image_ids"]

    response = await client.patch(
        f"/api/v1/sellers/me/products/{image_patch_seed['product_id']}/images",
        cookies=image_patch_seed["seller1_cookies"],
        json={
            "images": [
                {"id": image3, "display_order": 10, "is_thumbnail": True},
                {"id": image1, "display_order": 20, "is_thumbnail": False},
                {"id": image2, "display_order": 30, "is_thumbnail": False},
            ]
        },
    )

    assert response.status_code == 200
    data = response.json()

    assert data["id"] == image_patch_seed["product_id"]
    assert data["slug"] == "main-product"
    assert [image["id"] for image in data["images"]] == [image3, image1, image2]
    assert [image["display_order"] for image in data["images"]] == [0, 1, 2]
    assert [image["is_thumbnail"] for image in data["images"]] == [True, False, False]


@pytest.mark.asyncio
async def test_update_product_images_thumbnail_only_change_success(
    client: AsyncClient,
    image_patch_seed,
):
    image1, image2, image3 = image_patch_seed["image_ids"]

    response = await client.patch(
        f"/api/v1/sellers/me/products/{image_patch_seed['product_id']}/images",
        cookies=image_patch_seed["seller1_cookies"],
        json={
            "images": [
                {"id": image1, "display_order": 0, "is_thumbnail": False},
                {"id": image2, "display_order": 1, "is_thumbnail": True},
                {"id": image3, "display_order": 2, "is_thumbnail": False},
            ]
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert [image["id"] for image in data["images"]] == [image1, image2, image3]
    assert [image["display_order"] for image in data["images"]] == [0, 1, 2]
    assert [image["is_thumbnail"] for image in data["images"]] == [False, True, False]


@pytest.mark.asyncio
async def test_update_product_images_reorder_only_change_success(
    client: AsyncClient,
    image_patch_seed,
):
    image1, image2, image3 = image_patch_seed["image_ids"]

    response = await client.patch(
        f"/api/v1/sellers/me/products/{image_patch_seed['product_id']}/images",
        cookies=image_patch_seed["seller1_cookies"],
        json={
            "images": [
                {"id": image2, "display_order": 5, "is_thumbnail": False},
                {"id": image3, "display_order": 6, "is_thumbnail": False},
                {"id": image1, "display_order": 7, "is_thumbnail": True},
            ]
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert [image["id"] for image in data["images"]] == [image2, image3, image1]
    assert [image["display_order"] for image in data["images"]] == [0, 1, 2]
    assert [image["is_thumbnail"] for image in data["images"]] == [False, False, True]


@pytest.mark.asyncio
async def test_update_product_images_forbidden_for_other_seller(
    client: AsyncClient,
    image_patch_seed,
):
    image1, image2, image3 = image_patch_seed["image_ids"]

    response = await client.patch(
        f"/api/v1/sellers/me/products/{image_patch_seed['product_id']}/images",
        cookies=image_patch_seed["seller2_cookies"],
        json={
            "images": [
                {"id": image1, "display_order": 0, "is_thumbnail": True},
                {"id": image2, "display_order": 1, "is_thumbnail": False},
                {"id": image3, "display_order": 2, "is_thumbnail": False},
            ]
        },
    )

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_update_product_images_rejects_image_from_another_product(
    client: AsyncClient,
    image_patch_seed,
):
    image1, image2, _ = image_patch_seed["image_ids"]

    response = await client.patch(
        f"/api/v1/sellers/me/products/{image_patch_seed['product_id']}/images",
        cookies=image_patch_seed["seller1_cookies"],
        json={
            "images": [
                {"id": image1, "display_order": 0, "is_thumbnail": True},
                {"id": image2, "display_order": 1, "is_thumbnail": False},
                {"id": image_patch_seed["sibling_image_id"], "display_order": 2, "is_thumbnail": False},
            ]
        },
    )

    assert response.status_code == 400
    error_msg = get_error_message(response.json()).lower()
    assert "target product" in error_msg or "full image set" in error_msg


@pytest.mark.asyncio
async def test_update_product_images_rejects_missing_existing_image(
    client: AsyncClient,
    image_patch_seed,
):
    image1, image2, _ = image_patch_seed["image_ids"]

    response = await client.patch(
        f"/api/v1/sellers/me/products/{image_patch_seed['product_id']}/images",
        cookies=image_patch_seed["seller1_cookies"],
        json={
            "images": [
                {"id": image1, "display_order": 0, "is_thumbnail": True},
                {"id": image2, "display_order": 1, "is_thumbnail": False},
            ]
        },
    )

    assert response.status_code == 400
    assert "full image set" in get_error_message(response.json()).lower()


@pytest.mark.asyncio
async def test_update_product_images_rejects_duplicate_image_ids(
    client: AsyncClient,
    image_patch_seed,
):
    image1, image2, _ = image_patch_seed["image_ids"]

    response = await client.patch(
        f"/api/v1/sellers/me/products/{image_patch_seed['product_id']}/images",
        cookies=image_patch_seed["seller1_cookies"],
        json={
            "images": [
                {"id": image1, "display_order": 0, "is_thumbnail": True},
                {"id": image1, "display_order": 1, "is_thumbnail": False},
                {"id": image2, "display_order": 2, "is_thumbnail": False},
            ]
        },
    )

    assert response.status_code == 400
    assert "duplicate image ids" in get_error_message(response.json()).lower()


@pytest.mark.asyncio
async def test_update_product_images_rejects_duplicate_display_order(
    client: AsyncClient,
    image_patch_seed,
):
    image1, image2, image3 = image_patch_seed["image_ids"]

    response = await client.patch(
        f"/api/v1/sellers/me/products/{image_patch_seed['product_id']}/images",
        cookies=image_patch_seed["seller1_cookies"],
        json={
            "images": [
                {"id": image1, "display_order": 0, "is_thumbnail": True},
                {"id": image2, "display_order": 0, "is_thumbnail": False},
                {"id": image3, "display_order": 1, "is_thumbnail": False},
            ]
        },
    )

    assert response.status_code == 400
    assert "display_order" in get_error_message(response.json()).lower()


@pytest.mark.asyncio
async def test_update_product_images_rejects_zero_thumbnails(
    client: AsyncClient,
    image_patch_seed,
):
    image1, image2, image3 = image_patch_seed["image_ids"]

    response = await client.patch(
        f"/api/v1/sellers/me/products/{image_patch_seed['product_id']}/images",
        cookies=image_patch_seed["seller1_cookies"],
        json={
            "images": [
                {"id": image1, "display_order": 0, "is_thumbnail": False},
                {"id": image2, "display_order": 1, "is_thumbnail": False},
                {"id": image3, "display_order": 2, "is_thumbnail": False},
            ]
        },
    )

    assert response.status_code == 400
    assert "exactly one image" in get_error_message(response.json()).lower()


@pytest.mark.asyncio
async def test_update_product_images_rejects_multiple_thumbnails(
    client: AsyncClient,
    image_patch_seed,
):
    image1, image2, image3 = image_patch_seed["image_ids"]

    response = await client.patch(
        f"/api/v1/sellers/me/products/{image_patch_seed['product_id']}/images",
        cookies=image_patch_seed["seller1_cookies"],
        json={
            "images": [
                {"id": image1, "display_order": 0, "is_thumbnail": True},
                {"id": image2, "display_order": 1, "is_thumbnail": True},
                {"id": image3, "display_order": 2, "is_thumbnail": False},
            ]
        },
    )

    assert response.status_code == 400
    assert "exactly one image" in get_error_message(response.json()).lower()


@pytest.mark.asyncio
async def test_update_product_images_returns_full_product_shape(
    client: AsyncClient,
    image_patch_seed,
):
    image1, image2, image3 = image_patch_seed["image_ids"]

    response = await client.patch(
        f"/api/v1/sellers/me/products/{image_patch_seed['product_id']}/images",
        cookies=image_patch_seed["seller1_cookies"],
        json={
            "images": [
                {"id": image3, "display_order": 2, "is_thumbnail": False},
                {"id": image1, "display_order": 0, "is_thumbnail": True},
                {"id": image2, "display_order": 1, "is_thumbnail": False},
            ]
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert {"id", "seller_id", "category_id", "title", "slug", "description", "price", "stock", "is_available", "avg_rating", "review_count", "created_at", "updated_at", "images"} <= set(data.keys())
    assert [image["display_order"] for image in data["images"]] == [0, 1, 2]
