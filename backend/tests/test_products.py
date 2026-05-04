from __future__ import annotations

import asyncio
import pytest
from decimal import Decimal
from httpx import AsyncClient
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from application.security.tokens import create_access_token
from models import Category, Product, ProductImage, Seller, User, UserRole


def auth_cookies(user_id: int, role: str) -> dict[str, str]:
    token = create_access_token(
        user_id=user_id,
        role=role,
        secret_key="test-secret",
        expires_in_minutes=60,
    )
    return {"access_token": token}


@pytest.mark.asyncio
async def test_updated_at_auto_updates_on_product_modification(
    client: AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
):
    async with session_factory() as session:
        user = User(email="seller@test.com", password_hash="hash", role=UserRole.SELLER)
        session.add(user)
        await session.flush()
        
        seller = Seller(user_id=user.id, company_name="Test Company")
        session.add(seller)
        await session.flush()
        
        category = Category(name="Electronics")
        session.add(category)
        await session.flush()
        
        product = Product(
            seller_id=seller.id,
            category_id=category.id,
            title="Test Product",
            slug="test-product",
            price=Decimal("100.00"),
            stock=10,
        )
        session.add(product)
        await session.commit()
        
        initial_updated_at = product.updated_at
        product_id = product.id
    
    await asyncio.sleep(1.1)
    
    async with session_factory() as session:
        product = await session.get(Product, product_id)
        product.price = Decimal("150.00")
        await session.commit()
        await session.refresh(product)
        
        assert product.updated_at > initial_updated_at


@pytest.mark.asyncio
async def test_updated_at_updates_on_availability_status_change(
    client: AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
):
    async with session_factory() as session:
        user = User(email="seller2@test.com", password_hash="hash", role=UserRole.SELLER)
        session.add(user)
        await session.flush()
        
        seller = Seller(user_id=user.id, company_name="Test Company 2")
        session.add(seller)
        await session.flush()
        
        category = Category(name="Books")
        session.add(category)
        await session.flush()
        
        product = Product(
            seller_id=seller.id,
            category_id=category.id,
            title="Test Book",
            slug="test-book",
            price=Decimal("20.00"),
            stock=5,
            is_available=True,
        )
        session.add(product)
        await session.commit()
        
        initial_updated_at = product.updated_at
        product_id = product.id
    
    await asyncio.sleep(1.1)
    
    async with session_factory() as session:
        product = await session.get(Product, product_id)
        product.is_available = False
        await session.commit()
        await session.refresh(product)
        
        assert product.updated_at > initial_updated_at


@pytest.mark.asyncio
async def test_updated_at_does_not_update_on_select_queries(
    client: AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
):
    async with session_factory() as session:
        user = User(email="seller3@test.com", password_hash="hash", role=UserRole.SELLER)
        session.add(user)
        await session.flush()
        
        seller = Seller(user_id=user.id, company_name="Test Company 3")
        session.add(seller)
        await session.flush()
        
        category = Category(name="Clothing")
        session.add(category)
        await session.flush()
        
        product = Product(
            seller_id=seller.id,
            category_id=category.id,
            title="Test Shirt",
            slug="test-shirt",
            price=Decimal("30.00"),
            stock=15,
        )
        session.add(product)
        await session.commit()
        
        initial_updated_at = product.updated_at
        product_id = product.id
    
    async with session_factory() as session:
        for _ in range(5):
            product = await session.get(Product, product_id)
        
        assert product.updated_at == initial_updated_at


@pytest.mark.asyncio
async def test_updated_at_persists_correctly_in_database(
    client: AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
):
    async with session_factory() as session:
        user = User(email="seller4@test.com", password_hash="hash", role=UserRole.SELLER)
        session.add(user)
        await session.flush()
        
        seller = Seller(user_id=user.id, company_name="Test Company 4")
        session.add(seller)
        await session.flush()
        
        category = Category(name="Toys")
        session.add(category)
        await session.flush()
        
        product = Product(
            seller_id=seller.id,
            category_id=category.id,
            title="Test Toy",
            slug="test-toy",
            price=Decimal("25.00"),
            stock=20,
        )
        session.add(product)
        await session.commit()
        product_id = product.id
    
    async with session_factory() as session:
        product = await session.get(Product, product_id)
        product.stock = 15
        await session.commit()
        await session.refresh(product)
        expected_updated_at = product.updated_at
    
    async with session_factory() as session:
        result = await session.execute(
            text("SELECT updated_at FROM products WHERE id = :id"),
            {"id": product_id}
        )
        row = result.fetchone()
        db_updated_at_str = str(row[0])
        expected_updated_at_str = expected_updated_at.strftime("%Y-%m-%d %H:%M:%S")
        
        assert db_updated_at_str.startswith(expected_updated_at_str)


@pytest.mark.asyncio
async def test_seller_cannot_update_another_sellers_product(
    client: AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
):
    async with session_factory() as session:
        user_a = User(email="sellera@test.com", password_hash="hash", role=UserRole.SELLER)
        user_b = User(email="sellerb@test.com", password_hash="hash", role=UserRole.SELLER)
        session.add_all([user_a, user_b])
        await session.flush()
        
        seller_a = Seller(user_id=user_a.id, company_name="Seller A")
        seller_b = Seller(user_id=user_b.id, company_name="Seller B")
        session.add_all([seller_a, seller_b])
        await session.flush()
        
        category = Category(name="Test Category")
        session.add(category)
        await session.flush()
        
        product = Product(
            seller_id=seller_b.id,
            category_id=category.id,
            title="Seller B Product",
            slug="seller-b-product",
            price=Decimal("100.00"),
            stock=10,
        )
        session.add(product)
        await session.commit()
        product_id = product.id
        
        cookies_a = auth_cookies(user_a.id, "seller")
    
    response = await client.patch(
        f"/api/v1/sellers/me/products/{product_id}",
        json={"price": 99.99},
        cookies=cookies_a,
    )
    
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_update_single_field_title_only(
    client: AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
):
    async with session_factory() as session:
        user = User(email="seller5@test.com", password_hash="hash", role=UserRole.SELLER)
        session.add(user)
        await session.flush()
        
        seller = Seller(user_id=user.id, company_name="Test Company 5")
        session.add(seller)
        await session.flush()
        
        category = Category(name="Gadgets")
        session.add(category)
        await session.flush()
        
        product = Product(
            seller_id=seller.id,
            category_id=category.id,
            title="Old Title",
            slug="old-title",
            price=Decimal("50.00"),
            stock=10,
        )
        session.add(product)
        await session.commit()
        product_id = product.id
        
        cookies = auth_cookies(user.id, "seller")
    
    response = await client.patch(
        f"/api/v1/sellers/me/products/{product_id}",
        json={"title": "New Title"},
        cookies=cookies,
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "New Title"
    assert data["price"] == "50.00"
    assert data["stock"] == 10


@pytest.mark.asyncio
async def test_update_multiple_fields(
    client: AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
):
    async with session_factory() as session:
        user = User(email="seller6@test.com", password_hash="hash", role=UserRole.SELLER)
        session.add(user)
        await session.flush()
        
        seller = Seller(user_id=user.id, company_name="Test Company 6")
        session.add(seller)
        await session.flush()
        
        category = Category(name="Sports")
        session.add(category)
        await session.flush()
        
        product = Product(
            seller_id=seller.id,
            category_id=category.id,
            title="A",
            slug="a",
            price=Decimal("50.00"),
            stock=10,
        )
        session.add(product)
        await session.commit()
        product_id = product.id
        
        cookies = auth_cookies(user.id, "seller")
    
    response = await client.patch(
        f"/api/v1/sellers/me/products/{product_id}",
        json={"title": "B", "price": 75.50, "stock": 5},
        cookies=cookies,
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "B"
    assert data["price"] == "75.50"
    assert data["stock"] == 5


@pytest.mark.asyncio
async def test_invalid_price_rejected(
    client: AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
):
    async with session_factory() as session:
        user = User(email="seller7@test.com", password_hash="hash", role=UserRole.SELLER)
        session.add(user)
        await session.flush()
        
        seller = Seller(user_id=user.id, company_name="Test Company 7")
        session.add(seller)
        await session.flush()
        
        category = Category(name="Home")
        session.add(category)
        await session.flush()
        
        product = Product(
            seller_id=seller.id,
            category_id=category.id,
            title="Test Product",
            slug="test-product-home",
            price=Decimal("100.00"),
            stock=10,
        )
        session.add(product)
        await session.commit()
        product_id = product.id
        
        cookies = auth_cookies(user.id, "seller")
    
    response = await client.patch(
        f"/api/v1/sellers/me/products/{product_id}",
        json={"price": -10},
        cookies=cookies,
    )
    
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_invalid_stock_rejected(
    client: AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
):
    async with session_factory() as session:
        user = User(email="seller8@test.com", password_hash="hash", role=UserRole.SELLER)
        session.add(user)
        await session.flush()
        
        seller = Seller(user_id=user.id, company_name="Test Company 8")
        session.add(seller)
        await session.flush()
        
        category = Category(name="Garden")
        session.add(category)
        await session.flush()
        
        product = Product(
            seller_id=seller.id,
            category_id=category.id,
            title="Test Product",
            slug="test-product-garden",
            price=Decimal("100.00"),
            stock=10,
        )
        session.add(product)
        await session.commit()
        product_id = product.id
        
        cookies = auth_cookies(user.id, "seller")
    
    response = await client.patch(
        f"/api/v1/sellers/me/products/{product_id}",
        json={"stock": -5},
        cookies=cookies,
    )
    
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_non_existent_product_returns_404(
    client: AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
):
    async with session_factory() as session:
        user = User(email="seller9@test.com", password_hash="hash", role=UserRole.SELLER)
        session.add(user)
        await session.flush()
        
        seller = Seller(user_id=user.id, company_name="Test Company 9")
        session.add(seller)
        await session.commit()
        
        cookies = auth_cookies(user.id, "seller")
    
    response = await client.patch(
        "/api/v1/sellers/me/products/99999",
        json={"price": 100},
        cookies=cookies,
    )
    
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_toggle_availability_to_false(
    client: AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
):
    async with session_factory() as session:
        user = User(email="seller10@test.com", password_hash="hash", role=UserRole.SELLER)
        session.add(user)
        await session.flush()
        
        seller = Seller(user_id=user.id, company_name="Test Company 10")
        session.add(seller)
        await session.flush()
        
        category = Category(name="Food")
        session.add(category)
        await session.flush()
        
        product = Product(
            seller_id=seller.id,
            category_id=category.id,
            title="Test Food",
            slug="test-food",
            price=Decimal("10.00"),
            stock=100,
            is_available=True,
        )
        session.add(product)
        await session.commit()
        product_id = product.id
        
        cookies = auth_cookies(user.id, "seller")
    
    response = await client.patch(
        f"/api/v1/sellers/me/products/{product_id}",
        json={"is_available": False},
        cookies=cookies,
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["is_available"] is False


@pytest.mark.asyncio
async def test_patch_triggers_updated_at_update(
    client: AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
):
    async with session_factory() as session:
        user = User(email="seller11@test.com", password_hash="hash", role=UserRole.SELLER)
        session.add(user)
        await session.flush()
        
        seller = Seller(user_id=user.id, company_name="Test Company 11")
        session.add(seller)
        await session.flush()
        
        category = Category(name="Music")
        session.add(category)
        await session.flush()
        
        product = Product(
            seller_id=seller.id,
            category_id=category.id,
            title="Test Album",
            slug="test-album",
            price=Decimal("15.00"),
            stock=50,
        )
        session.add(product)
        await session.commit()
        
        initial_updated_at = product.updated_at
        product_id = product.id
        
        cookies = auth_cookies(user.id, "seller")
    
    await asyncio.sleep(1.1)
    
    response = await client.patch(
        f"/api/v1/sellers/me/products/{product_id}",
        json={"price": 100},
        cookies=cookies,
    )
    
    assert response.status_code == 200
    data = response.json()
    from datetime import datetime
    updated_at = datetime.fromisoformat(data["updated_at"].replace("Z", "+00:00"))
    
    assert updated_at > initial_updated_at


@pytest.mark.asyncio
async def test_response_includes_updated_at_timestamp(
    client: AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
):
    async with session_factory() as session:
        user = User(email="seller12@test.com", password_hash="hash", role=UserRole.SELLER)
        session.add(user)
        await session.flush()
        
        seller = Seller(user_id=user.id, company_name="Test Company 12")
        session.add(seller)
        await session.flush()
        
        category = Category(name="Art")
        session.add(category)
        await session.flush()
        
        product = Product(
            seller_id=seller.id,
            category_id=category.id,
            title="Test Art",
            slug="test-art",
            price=Decimal("200.00"),
            stock=1,
        )
        session.add(product)
        await session.commit()
        product_id = product.id
        
        cookies = auth_cookies(user.id, "seller")
    
    response = await client.patch(
        f"/api/v1/sellers/me/products/{product_id}",
        json={"price": 250},
        cookies=cookies,
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "updated_at" in data
    assert data["updated_at"] is not None


@pytest.mark.asyncio
async def test_get_product_by_slug_returns_expected_shape(
    client: AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
):
    async with session_factory() as session:
        user = User(email="seller-get-product@test.com", password_hash="hash", role=UserRole.SELLER)
        session.add(user)
        await session.flush()

        seller = Seller(
            user_id=user.id,
            company_name="Public Seller",
            logo_path="sellers/public-seller/logo.png",
        )
        session.add(seller)
        await session.flush()

        category = Category(name="Public Category")
        session.add(category)
        await session.flush()

        target_product = Product(
            seller_id=seller.id,
            category_id=category.id,
            title="Public Product",
            slug="public-product",
            description="Public product description",
            price=Decimal("99.90"),
            stock=5,
            is_available=True,
            avg_rating=Decimal("4.50"),
            review_count=12,
        )
        extra_product = Product(
            seller_id=seller.id,
            category_id=category.id,
            title="Extra Product",
            slug="extra-product",
            description="Extra product description",
            price=Decimal("49.90"),
            stock=2,
            is_available=True,
            avg_rating=Decimal("3.50"),
            review_count=2,
        )
        session.add_all([target_product, extra_product])
        await session.flush()

        session.add_all(
            [
                ProductImage(
                    product_id=target_product.id,
                    path=f"products/{target_product.id}/b.jpg",
                    is_thumbnail=False,
                    display_order=1,
                ),
                ProductImage(
                    product_id=target_product.id,
                    path=f"products/{target_product.id}/a.jpg",
                    is_thumbnail=True,
                    display_order=0,
                ),
            ]
        )
        await session.commit()
        product_id = target_product.id
        product_slug = target_product.slug

    response = await client.get(f"/api/v1/products/{product_slug}")

    assert response.status_code == 200
    data = response.json()

    assert {
        "id",
        "title",
        "slug",
        "description",
        "price",
        "stock",
        "is_available",
        "images",
        "avg_rating",
        "review_count",
        "category",
        "seller",
        "created_at",
        "updated_at",
    } <= set(data.keys())
    assert data["id"] == product_id
    assert data["title"] == "Public Product"
    assert data["slug"] == "public-product"
    assert data["price"] == "99.90"
    assert data["stock"] == 5
    assert data["is_available"] is True

    assert len(data["images"]) == 2
    assert data["images"][0]["order"] == 0
    assert data["images"][0]["is_thumbnail"] is True
    assert data["images"][0]["url"] == f"/media/products/{product_id}/a.jpg"
    assert data["images"][1]["order"] == 1
    assert data["images"][1]["is_thumbnail"] is False
    assert data["images"][1]["url"] == f"/media/products/{product_id}/b.jpg"

    assert data["category"]["id"] > 0
    assert data["category"]["name"] == "Public Category"
    assert data["seller"]["id"] > 0
    assert data["seller"]["company_name"] == "Public Seller"
    assert data["seller"]["logo_url"] == "/media/sellers/public-seller/logo.png"
    assert Decimal(str(data["seller"]["avg_rating"])) == Decimal("4.0")


@pytest.mark.asyncio
async def test_get_product_by_slug_returns_unavailable_product_with_zero_stock(
    client: AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
):
    async with session_factory() as session:
        user = User(email="seller-hidden-product@test.com", password_hash="hash", role=UserRole.SELLER)
        session.add(user)
        await session.flush()

        seller = Seller(user_id=user.id, company_name="Hidden Seller")
        session.add(seller)
        await session.flush()

        category = Category(name="Hidden Category")
        session.add(category)
        await session.flush()

        product = Product(
            seller_id=seller.id,
            category_id=category.id,
            title="Hidden Product",
            slug="hidden-product",
            description="Hidden product description",
            price=Decimal("10.00"),
            stock=0,
            is_available=False,
        )
        session.add(product)
        await session.commit()
        product_id = product.id
        product_slug = product.slug

    response = await client.get(f"/api/v1/products/{product_slug}")

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == product_id
    assert data["stock"] == 0
    assert data["is_available"] is False


@pytest.mark.asyncio
async def test_get_product_by_slug_returns_404_when_missing(client: AsyncClient):
    response = await client.get("/api/v1/products/missing-product-slug")

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_list_products_returns_filtered_results_with_pagination_and_shape(
    client: AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
):
    async with session_factory() as session:
        seller_user = User(email="list-seller@test.com", password_hash="hash", role=UserRole.SELLER)
        session.add(seller_user)
        await session.flush()
        seller = Seller(
            user_id=seller_user.id,
            company_name="List Seller",
            logo_path="sellers/list-seller/logo.png",
        )
        session.add(seller)
        await session.flush()

        category = Category(name="List Category")
        session.add(category)
        await session.flush()

        product_1 = Product(
            seller_id=seller.id,
            category_id=category.id,
            title="Phone Alpha",
            slug="phone-alpha",
            description="alpha description",
            price=Decimal("100.00"),
            stock=8,
            is_available=True,
            avg_rating=Decimal("4.60"),
            review_count=11,
        )
        product_2 = Product(
            seller_id=seller.id,
            category_id=category.id,
            title="Phone Beta",
            slug="phone-beta",
            description="beta description",
            price=Decimal("80.00"),
            stock=4,
            is_available=True,
            avg_rating=Decimal("4.20"),
            review_count=5,
        )
        product_3 = Product(
            seller_id=seller.id,
            category_id=category.id,
            title="Phone Hidden",
            slug="phone-hidden",
            description="hidden description",
            price=Decimal("50.00"),
            stock=0,
            is_available=False,
            avg_rating=Decimal("5.00"),
            review_count=1,
        )
        session.add_all([product_1, product_2, product_3])
        await session.flush()
        session.add(
            ProductImage(
                product_id=product_1.id,
                path=f"products/{product_1.id}/thumb.jpg",
                is_thumbnail=True,
                display_order=0,
            )
        )
        await session.commit()

        category_id = category.id
        seller_id = seller.id

    response = await client.get(
        "/api/v1/products",
        params={
            "q": "phone",
            "category_id": category_id,
            "seller_id": seller_id,
            "min_price": "90.00",
            "min_rating": "4.5",
            "sort": "price_desc",
            "page": 1,
            "page_size": 20,
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert list(data.keys()) == ["data", "pagination"]
    assert data["pagination"] == {
        "page": 1,
        "page_size": 20,
        "total_items": 1,
        "total_pages": 1,
    }
    assert len(data["data"]) == 1

    item = data["data"][0]
    assert {
        "id",
        "title",
        "slug",
        "price",
        "stock",
        "is_available",
        "thumbnail_url",
        "avg_rating",
        "review_count",
        "category",
        "seller",
    } == set(item.keys())
    assert item["title"] == "Phone Alpha"
    assert item["is_available"] is True
    assert item["thumbnail_url"].endswith("/thumb.jpg")
    assert item["category"]["id"] == category_id
    assert item["seller"]["id"] == seller_id
    assert item["seller"]["logo_url"] == "/media/sellers/list-seller/logo.png"


@pytest.mark.asyncio
async def test_list_products_supports_sort_and_pagination(
    client: AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
):
    async with session_factory() as session:
        seller_user = User(email="list-seller-sort@test.com", password_hash="hash", role=UserRole.SELLER)
        session.add(seller_user)
        await session.flush()
        seller = Seller(user_id=seller_user.id, company_name="Sort Seller")
        session.add(seller)
        await session.flush()

        category = Category(name="Sort Category")
        session.add(category)
        await session.flush()

        session.add_all(
            [
                Product(
                    seller_id=seller.id,
                    category_id=category.id,
                    title="Sort 1",
                    slug="sort-1",
                    description="s1",
                    price=Decimal("30.00"),
                    stock=1,
                    is_available=True,
                ),
                Product(
                    seller_id=seller.id,
                    category_id=category.id,
                    title="Sort 2",
                    slug="sort-2",
                    description="s2",
                    price=Decimal("10.00"),
                    stock=1,
                    is_available=True,
                ),
                Product(
                    seller_id=seller.id,
                    category_id=category.id,
                    title="Sort 3",
                    slug="sort-3",
                    description="s3",
                    price=Decimal("20.00"),
                    stock=1,
                    is_available=True,
                ),
            ]
        )
        await session.commit()

    response = await client.get(
        "/api/v1/products",
        params={"sort": "price_asc", "page": 2, "page_size": 1},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["pagination"] == {
        "page": 2,
        "page_size": 1,
        "total_items": 3,
        "total_pages": 3,
    }
    assert len(data["data"]) == 1
    assert data["data"][0]["price"] == "20.00"


@pytest.mark.asyncio
async def test_list_products_forces_is_available_for_unauthenticated_and_buyer(
    client: AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
):
    async with session_factory() as session:
        seller_user = User(email="list-visible-seller@test.com", password_hash="hash", role=UserRole.SELLER)
        buyer_user = User(email="list-visible-buyer@test.com", password_hash="hash", role=UserRole.BUYER)
        session.add_all([seller_user, buyer_user])
        await session.flush()
        seller = Seller(user_id=seller_user.id, company_name="Visible Seller")
        session.add(seller)
        await session.flush()

        category = Category(name="Visible Category")
        session.add(category)
        await session.flush()

        session.add_all(
            [
                Product(
                    seller_id=seller.id,
                    category_id=category.id,
                    title="Visible Product",
                    slug="visible-product",
                    description="visible",
                    price=Decimal("10.00"),
                    stock=10,
                    is_available=True,
                ),
                Product(
                    seller_id=seller.id,
                    category_id=category.id,
                    title="Hidden Product 2",
                    slug="hidden-product-2",
                    description="hidden",
                    price=Decimal("20.00"),
                    stock=0,
                    is_available=False,
                ),
            ]
        )
        await session.commit()
        seller_cookies = auth_cookies(seller_user.id, "seller")
        buyer_cookies = auth_cookies(buyer_user.id, "buyer")

    unauth_response = await client.get("/api/v1/products", params={"is_available": False})
    assert unauth_response.status_code == 200
    assert all(item["is_available"] is True for item in unauth_response.json()["data"])

    buyer_response = await client.get(
        "/api/v1/products",
        params={"is_available": False},
        cookies=buyer_cookies,
    )
    assert buyer_response.status_code == 200
    assert all(item["is_available"] is True for item in buyer_response.json()["data"])

    seller_response = await client.get(
        "/api/v1/products",
        params={"is_available": False},
        cookies=seller_cookies,
    )
    assert seller_response.status_code == 200
    seller_data = seller_response.json()["data"]
    assert len(seller_data) == 1
    assert seller_data[0]["is_available"] is False
