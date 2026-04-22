from __future__ import annotations

import asyncio
import pytest
from decimal import Decimal
from httpx import AsyncClient
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from application.security.tokens import create_access_token
from models import Category, Product, Seller, User, UserRole


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
