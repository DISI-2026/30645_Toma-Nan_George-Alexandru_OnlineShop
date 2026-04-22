from __future__ import annotations

import io
from decimal import Decimal
from pathlib import Path

import pytest
import pytest_asyncio
from httpx import AsyncClient
from PIL import Image
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from sqlalchemy.orm import selectinload

from application.security.tokens import create_access_token
from models import Category, Product, ProductImage, Seller, User, UserRole
from models.seller_category import seller_categories


def get_error_message(response_data: dict) -> str:
    """Extract error message from response, handling both formats."""
    if "detail" in response_data:
        return str(response_data["detail"])
    elif "error" in response_data:
        error = response_data["error"]
        if isinstance(error, dict):
            return str(error.get("message", error))
        return str(error)
    return str(response_data)


@pytest_asyncio.fixture
async def seed_data(session_factory: async_sessionmaker[AsyncSession]):
    async with session_factory() as session:
        user1 = User(email="seller1@test.com", password_hash="hash", role=UserRole.SELLER)
        user2 = User(email="seller2@test.com", password_hash="hash", role=UserRole.SELLER)
        session.add_all([user1, user2])
        await session.flush()
        
        seller1 = Seller(user_id=user1.id, company_name="Seller 1")
        seller2 = Seller(user_id=user2.id, company_name="Seller 2")
        session.add_all([seller1, seller2])
        await session.flush()
        
        cat_electronics = Category(name="Electronics")
        cat_clothing = Category(name="Clothing")
        cat_smartphones = Category(name="Smartphones", parent_id=None)
        session.add_all([cat_electronics, cat_clothing, cat_smartphones])
        await session.flush()
        
        cat_smartphones.parent_id = cat_electronics.id
        
        await session.execute(
            seller_categories.insert().values([
                {"seller_id": seller1.id, "category_id": cat_electronics.id},
                {"seller_id": seller1.id, "category_id": cat_smartphones.id},
                {"seller_id": seller2.id, "category_id": cat_clothing.id},
            ])
        )
        
        await session.commit()
        
        return {
            "seller1_id": seller1.id,
            "seller2_id": seller2.id,
            "user1_id": user1.id,
            "user2_id": user2.id,
            "electronics_id": cat_electronics.id,
            "clothing_id": cat_clothing.id,
            "smartphones_id": cat_smartphones.id,
        }


def auth_cookies(user_id: int, role: str) -> dict[str, str]:
    token = create_access_token(
        user_id=user_id,
        role=role,
        secret_key="test-secret",
        expires_in_minutes=60,
    )
    return {"access_token": token}


@pytest.fixture
def seller1_cookies(seed_data):
    return auth_cookies(user_id=seed_data["user1_id"], role="seller")


@pytest.fixture
def seller2_cookies(seed_data):
    return auth_cookies(user_id=seed_data["user2_id"], role="seller")


def create_test_image(format: str = "JPEG", size_mb: float = 1.0) -> bytes:
    img = Image.new("RGB", (800, 600), color="red")
    buffer = io.BytesIO()
    img.save(buffer, format=format)
    buffer.seek(0)
    return buffer.read()


def create_large_image() -> bytes:
    img = Image.new("RGB", (5000, 4000), color="blue")
    buffer = io.BytesIO()
    img.save(buffer, format="JPEG", quality=100)
    buffer.seek(0)
    data = buffer.read()
    # Ensure it's actually over 5MB
    if len(data) < 5 * 1024 * 1024:
        # Pad with extra data to make it over 5MB
        data += b'\x00' * (6 * 1024 * 1024 - len(data))
    return data


def create_corrupted_image() -> bytes:
    return b"not a real image file"


@pytest.mark.asyncio
async def test_create_product_with_images_success(
    client: AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
    seed_data,
    seller1_cookies: dict,
):
    image1 = create_test_image("JPEG")
    image2 = create_test_image("PNG")
    image3 = create_test_image("WEBP")
    
    response = await client.post(
        "/api/v1/sellers/me/products",
        cookies=seller1_cookies,
        data={
            "title": "iPhone 15 Pro Max",
            "description": "Latest flagship smartphone with A17 Pro chip",
            "price": "1199.99",
            "stock": "50",
            "category_id": str(seed_data["smartphones_id"]),
        },
        files=[
            ("images", ("image1.jpg", image1, "image/jpeg")),
            ("images", ("image2.png", image2, "image/png")),
            ("images", ("image3.webp", image3, "image/webp")),
        ],
    )
    
    assert response.status_code == 201
    data = response.json()
    
    assert data["title"] == "iPhone 15 Pro Max"
    assert data["slug"] == "iphone-15-pro-max"
    assert data["description"] == "Latest flagship smartphone with A17 Pro chip"
    assert data["price"] == "1199.99"
    assert data["stock"] == 50
    assert data["seller_id"] == seed_data["seller1_id"]
    assert data["category_id"] == seed_data["smartphones_id"]
    assert data["is_available"] is True
    assert len(data["images"]) == 3
    
    assert data["images"][0]["is_thumbnail"] is True
    assert data["images"][0]["display_order"] == 0
    assert data["images"][1]["is_thumbnail"] is False
    assert data["images"][1]["display_order"] == 1
    assert data["images"][2]["is_thumbnail"] is False
    assert data["images"][2]["display_order"] == 2
    
    async with session_factory() as session:
        result = await session.execute(
            select(Product).where(Product.id == data["id"]).options(selectinload(Product.images))
        )
        product = result.scalar_one()
        assert product is not None
        assert len(product.images) == 3


@pytest.mark.asyncio
async def test_create_product_without_images_success(
    client: AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
    seed_data,
    seller1_cookies: dict,
):
    response = await client.post(
        "/api/v1/sellers/me/products",
        cookies=seller1_cookies,
        data={
            "title": "MacBook Pro 16-inch",
            "description": "Professional laptop with M3 Max chip",
            "price": "2499.00",
            "stock": "25",
            "category_id": str(seed_data["electronics_id"]),
        },
    )
    
    assert response.status_code == 201
    data = response.json()
    
    assert data["title"] == "MacBook Pro 16-inch"
    assert data["slug"] == "macbook-pro-16-inch"
    assert data["images"] == []


@pytest.mark.asyncio
async def test_create_product_duplicate_title_slug_increment(
    client: AsyncClient,
    seed_data,
    seller1_cookies: dict,
):
    response1 = await client.post(
        "/api/v1/sellers/me/products",
        cookies=seller1_cookies,
        data={
            "title": "iPhone 15 Pro Max",
            "description": "First listing",
            "price": "1199.99",
            "stock": "50",
            "category_id": str(seed_data["smartphones_id"]),
        },
    )
    assert response1.status_code == 201
    assert response1.json()["slug"] == "iphone-15-pro-max"
    
    response2 = await client.post(
        "/api/v1/sellers/me/products",
        cookies=seller1_cookies,
        data={
            "title": "iPhone 15 Pro Max",
            "description": "Second listing",
            "price": "1299.99",
            "stock": "30",
            "category_id": str(seed_data["smartphones_id"]),
        },
    )
    assert response2.status_code == 201
    assert response2.json()["slug"] == "iphone-15-pro-max-1"


@pytest.mark.asyncio
async def test_create_product_unauthorized_no_token(client: AsyncClient, seed_data):
    response = await client.post(
        "/api/v1/sellers/me/products",
        data={
            "title": "Test Product",
            "description": "Test description",
            "price": "99.99",
            "stock": "10",
            "category_id": str(seed_data["electronics_id"]),
        },
    )
    
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_create_product_forbidden_seller_category_mismatch(
    client: AsyncClient,
    seed_data,
    seller1_cookies: dict,
):
    response = await client.post(
        "/api/v1/sellers/me/products",
        cookies=seller1_cookies,
        data={
            "title": "T-Shirt",
            "description": "Cotton t-shirt in various colors",
            "price": "29.99",
            "stock": "100",
            "category_id": str(seed_data["clothing_id"]),
        },
    )
    
    assert response.status_code == 403
    error_msg = get_error_message(response.json()).lower()
    assert "assigned categories" in error_msg or "category" in error_msg or "seller" in error_msg


@pytest.mark.asyncio
async def test_create_product_not_found_invalid_category(
    client: AsyncClient,
    seller1_cookies: dict,
):
    response = await client.post(
        "/api/v1/sellers/me/products",
        cookies=seller1_cookies,
        data={
            "title": "Test Product",
            "description": "Test description",
            "price": "99.99",
            "stock": "10",
            "category_id": "999999",
        },
    )
    
    assert response.status_code == 404
    error_msg = get_error_message(response.json()).lower()
    assert "category" in error_msg or "not found" in error_msg


@pytest.mark.asyncio
async def test_create_product_title_too_short(
    client: AsyncClient,
    seed_data,
    seller1_cookies: dict,
):
    response = await client.post(
        "/api/v1/sellers/me/products",
        cookies=seller1_cookies,
        data={
            "title": "AB",
            "description": "Valid description with more than ten characters",
            "price": "99.99",
            "stock": "10",
            "category_id": str(seed_data["electronics_id"]),
        },
    )
    
    assert response.status_code == 400
    error_msg = get_error_message(response.json()).lower()
    assert "title" in error_msg


@pytest.mark.asyncio
async def test_create_product_title_too_long(
    client: AsyncClient,
    seed_data,
    seller1_cookies: dict,
):
    long_title = "A" * 201
    response = await client.post(
        "/api/v1/sellers/me/products",
        cookies=seller1_cookies,
        data={
            "title": long_title,
            "description": "Valid description",
            "price": "99.99",
            "stock": "10",
            "category_id": str(seed_data["electronics_id"]),
        },
    )
    
    assert response.status_code == 400
    error_msg = get_error_message(response.json()).lower()
    assert "title" in error_msg


@pytest.mark.asyncio
async def test_create_product_description_too_short(
    client: AsyncClient,
    seed_data,
    seller1_cookies: dict,
):
    response = await client.post(
        "/api/v1/sellers/me/products",
        cookies=seller1_cookies,
        data={
            "title": "Valid Product Title",
            "description": "Short",
            "price": "99.99",
            "stock": "10",
            "category_id": str(seed_data["electronics_id"]),
        },
    )
    
    assert response.status_code == 400
    error_msg = get_error_message(response.json()).lower()
    assert "description" in error_msg


@pytest.mark.asyncio
async def test_create_product_description_too_long(
    client: AsyncClient,
    seed_data,
    seller1_cookies: dict,
):
    long_desc = "A" * 5001
    response = await client.post(
        "/api/v1/sellers/me/products",
        cookies=seller1_cookies,
        data={
            "title": "Valid Product Title",
            "description": long_desc,
            "price": "99.99",
            "stock": "10",
            "category_id": str(seed_data["electronics_id"]),
        },
    )
    
    assert response.status_code == 400
    error_msg = get_error_message(response.json()).lower()
    assert "description" in error_msg


@pytest.mark.asyncio
async def test_create_product_price_zero(
    client: AsyncClient,
    seed_data,
    seller1_cookies: dict,
):
    response = await client.post(
        "/api/v1/sellers/me/products",
        cookies=seller1_cookies,
        data={
            "title": "Free Product",
            "description": "This product is free",
            "price": "0.00",
            "stock": "10",
            "category_id": str(seed_data["electronics_id"]),
        },
    )
    
    assert response.status_code == 400
    error_msg = get_error_message(response.json()).lower()
    assert "price" in error_msg


@pytest.mark.asyncio
async def test_create_product_negative_price(
    client: AsyncClient,
    seed_data,
    seller1_cookies: dict,
):
    response = await client.post(
        "/api/v1/sellers/me/products",
        cookies=seller1_cookies,
        data={
            "title": "Invalid Product",
            "description": "Product with negative price",
            "price": "-50.00",
            "stock": "10",
            "category_id": str(seed_data["electronics_id"]),
        },
    )
    
    assert response.status_code == 400
    error_msg = get_error_message(response.json()).lower()
    assert "price" in error_msg


@pytest.mark.asyncio
async def test_create_product_negative_stock(
    client: AsyncClient,
    seed_data,
    seller1_cookies: dict,
):
    response = await client.post(
        "/api/v1/sellers/me/products",
        cookies=seller1_cookies,
        data={
            "title": "Valid Product",
            "description": "Product with negative stock",
            "price": "99.99",
            "stock": "-5",
            "category_id": str(seed_data["electronics_id"]),
        },
    )
    
    assert response.status_code == 400
    error_msg = get_error_message(response.json()).lower()
    assert "stock" in error_msg


@pytest.mark.asyncio
async def test_create_product_invalid_image_format_bmp(
    client: AsyncClient,
    seed_data,
    seller1_cookies: dict,
):
    bmp_image = create_test_image("BMP")
    
    response = await client.post(
        "/api/v1/sellers/me/products",
        cookies=seller1_cookies,
        data={
            "title": "Product with Invalid Image",
            "description": "Testing invalid image format",
            "price": "99.99",
            "stock": "10",
            "category_id": str(seed_data["electronics_id"]),
        },
        files=[("images", ("image.bmp", bmp_image, "image/bmp"))],
    )
    
    assert response.status_code == 400
    error_msg = get_error_message(response.json()).lower()
    assert "format" in error_msg


@pytest.mark.asyncio
async def test_create_product_invalid_image_format_gif(
    client: AsyncClient,
    seed_data,
    seller1_cookies: dict,
):
    gif_image = create_test_image("GIF")
    
    response = await client.post(
        "/api/v1/sellers/me/products",
        cookies=seller1_cookies,
        data={
            "title": "Product with GIF",
            "description": "Testing GIF image upload",
            "price": "99.99",
            "stock": "10",
            "category_id": str(seed_data["electronics_id"]),
        },
        files=[("images", ("animated.gif", gif_image, "image/gif"))],
    )
    
    assert response.status_code == 400
    error_msg = get_error_message(response.json()).lower()
    assert "format" in error_msg


@pytest.mark.asyncio
async def test_create_product_image_too_large(
    client: AsyncClient,
    seed_data,
    seller1_cookies: dict,
):
    large_image = create_large_image()
    
    response = await client.post(
        "/api/v1/sellers/me/products",
        cookies=seller1_cookies,
        data={
            "title": "Product with Large Image",
            "description": "Testing image size limit",
            "price": "99.99",
            "stock": "10",
            "category_id": str(seed_data["electronics_id"]),
        },
        files=[("images", ("large.jpg", large_image, "image/jpeg"))],
    )
    
    assert response.status_code == 400
    error_msg = get_error_message(response.json()).lower()
    assert "size" in error_msg or "5mb" in error_msg or "5" in error_msg


@pytest.mark.asyncio
async def test_create_product_too_many_images(
    client: AsyncClient,
    seed_data,
    seller1_cookies: dict,
):
    images = [create_test_image("JPEG") for _ in range(11)]
    
    response = await client.post(
        "/api/v1/sellers/me/products",
        cookies=seller1_cookies,
        data={
            "title": "Product with Many Images",
            "description": "Testing maximum image count",
            "price": "99.99",
            "stock": "10",
            "category_id": str(seed_data["electronics_id"]),
        },
        files=[(f"images", (f"image{i}.jpg", img, "image/jpeg")) for i, img in enumerate(images)],
    )
    
    assert response.status_code == 400
    error_msg = get_error_message(response.json())
    assert "10" in error_msg


@pytest.mark.asyncio
async def test_create_product_corrupted_image(
    client: AsyncClient,
    seed_data,
    seller1_cookies: dict,
):
    corrupted = create_corrupted_image()
    
    response = await client.post(
        "/api/v1/sellers/me/products",
        cookies=seller1_cookies,
        data={
            "title": "Product with Corrupted Image",
            "description": "Testing corrupted image handling",
            "price": "99.99",
            "stock": "10",
            "category_id": str(seed_data["electronics_id"]),
        },
        files=[("images", ("corrupted.jpg", corrupted, "image/jpeg"))],
    )
    
    assert response.status_code == 400
    error_msg = get_error_message(response.json()).lower()
    assert "invalid" in error_msg or "corrupted" in error_msg


@pytest.mark.asyncio
async def test_create_product_zero_stock_valid(
    client: AsyncClient,
    seed_data,
    seller1_cookies: dict,
):
    response = await client.post(
        "/api/v1/sellers/me/products",
        cookies=seller1_cookies,
        data={
            "title": "Out of Stock Product",
            "description": "Product currently out of stock",
            "price": "99.99",
            "stock": "0",
            "category_id": str(seed_data["electronics_id"]),
        },
    )
    
    assert response.status_code == 201
    assert response.json()["stock"] == 0


@pytest.mark.asyncio
async def test_create_product_exactly_10_images(
    client: AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
    seed_data,
    seller1_cookies: dict,
):
    images = [create_test_image("JPEG") for _ in range(10)]
    
    response = await client.post(
        "/api/v1/sellers/me/products",
        cookies=seller1_cookies,
        data={
            "title": "Product with Max Images",
            "description": "Testing maximum allowed image count",
            "price": "99.99",
            "stock": "10",
            "category_id": str(seed_data["electronics_id"]),
        },
        files=[(f"images", (f"image{i}.jpg", img, "image/jpeg")) for i, img in enumerate(images)],
    )
    
    assert response.status_code == 201
    data = response.json()
    assert len(data["images"]) == 10
    assert data["images"][0]["is_thumbnail"] is True
    assert data["images"][0]["display_order"] == 0
    assert data["images"][9]["display_order"] == 9


@pytest.mark.asyncio
async def test_create_product_minimum_title_length(
    client: AsyncClient,
    seed_data,
    seller1_cookies: dict,
):
    response = await client.post(
        "/api/v1/sellers/me/products",
        cookies=seller1_cookies,
        data={
            "title": "ABC",
            "description": "Minimum valid title length test",
            "price": "99.99",
            "stock": "10",
            "category_id": str(seed_data["electronics_id"]),
        },
    )
    
    assert response.status_code == 201
    assert response.json()["title"] == "ABC"
    assert response.json()["slug"] == "abc"


@pytest.mark.asyncio
async def test_create_product_maximum_title_length(
    client: AsyncClient,
    seed_data,
    seller1_cookies: dict,
):
    title_200 = "A" * 200
    response = await client.post(
        "/api/v1/sellers/me/products",
        cookies=seller1_cookies,
        data={
            "title": title_200,
            "description": "Maximum valid title length test",
            "price": "99.99",
            "stock": "10",
            "category_id": str(seed_data["electronics_id"]),
        },
    )
    
    assert response.status_code == 201
    assert len(response.json()["title"]) == 200


@pytest.mark.asyncio
async def test_create_product_special_characters_in_title(
    client: AsyncClient,
    seed_data,
    seller1_cookies: dict,
):
    response = await client.post(
        "/api/v1/sellers/me/products",
        cookies=seller1_cookies,
        data={
            "title": "Product™ with Special © Characters & Symbols!",
            "description": "Testing slug generation with special characters",
            "price": "99.99",
            "stock": "10",
            "category_id": str(seed_data["electronics_id"]),
        },
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Product™ with Special © Characters & Symbols!"
    assert "product" in data["slug"]
    assert "™" not in data["slug"]
    assert "©" not in data["slug"]


@pytest.mark.asyncio
async def test_create_product_whitespace_trimming(
    client: AsyncClient,
    seed_data,
    seller1_cookies: dict,
):
    response = await client.post(
        "/api/v1/sellers/me/products",
        cookies=seller1_cookies,
        data={
            "title": "   Product with Spaces   ",
            "description": "   Description with whitespace   ",
            "price": "99.99",
            "stock": "10",
            "category_id": str(seed_data["electronics_id"]),
        },
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Product with Spaces"
    assert data["description"] == "Description with whitespace"
    assert data["slug"] == "product-with-spaces"


@pytest.mark.asyncio
async def test_create_product_mixed_image_formats(
    client: AsyncClient,
    seed_data,
    seller1_cookies: dict,
):
    jpg_image = create_test_image("JPEG")
    png_image = create_test_image("PNG")
    webp_image = create_test_image("WEBP")
    
    response = await client.post(
        "/api/v1/sellers/me/products",
        cookies=seller1_cookies,
        data={
            "title": "Product with Mixed Images",
            "description": "Testing multiple image formats",
            "price": "99.99",
            "stock": "10",
            "category_id": str(seed_data["electronics_id"]),
        },
        files=[
            ("images", ("image1.jpg", jpg_image, "image/jpeg")),
            ("images", ("image2.png", png_image, "image/png")),
            ("images", ("image3.webp", webp_image, "image/webp")),
        ],
    )
    
    assert response.status_code == 201
    data = response.json()
    assert len(data["images"]) == 3
    assert ".jpg" in data["images"][0]["path"]
    assert ".png" in data["images"][1]["path"]
    assert ".webp" in data["images"][2]["path"]
