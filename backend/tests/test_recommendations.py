from __future__ import annotations

from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker

from api.dependencies.auth import ACCESS_TOKEN_COOKIE_NAME
from api.dependencies.neo4j import get_neo4j_service
from application.security import create_access_token, hash_password_pbkdf2
from models import Buyer, Category, Order, OrderItem, OrderStatus, Product, Seller, User, UserRole


def auth_cookies(user_id: int, role: str) -> dict[str, str]:
    token = create_access_token(
        user_id=user_id,
        role=role,
        secret_key="test-secret",
        expires_in_minutes=60,
    )
    return {ACCESS_TOKEN_COOKIE_NAME: token}


class FakeNeo4jService:
    def __init__(self, recommended_ids: list[int]):
        self.recommended_ids = recommended_ids
        self.calls: list[tuple[list[int], int]] = []

    async def get_related_products(self, product_ids: list[int], limit: int) -> list[int]:
        self.calls.append((product_ids, limit))
        return self.recommended_ids[:limit]


async def seed_recommendation_data(session_factory: async_sessionmaker):
    async with session_factory() as session:
        buyer_user = User(
            email="reco-buyer@example.com",
            password_hash=hash_password_pbkdf2("password123"),
            role=UserRole.BUYER,
        )
        other_buyer_user = User(
            email="reco-buyer-2@example.com",
            password_hash=hash_password_pbkdf2("password123"),
            role=UserRole.BUYER,
        )
        no_order_buyer_user = User(
            email="reco-buyer-3@example.com",
            password_hash=hash_password_pbkdf2("password123"),
            role=UserRole.BUYER,
        )
        seller_user = User(
            email="reco-seller@example.com",
            password_hash=hash_password_pbkdf2("password123"),
            role=UserRole.SELLER,
        )
        session.add_all([buyer_user, other_buyer_user, no_order_buyer_user, seller_user])
        await session.flush()

        buyer = Buyer(user_id=buyer_user.id, full_name="Reco Buyer", address="Cluj")
        other_buyer = Buyer(user_id=other_buyer_user.id, full_name="Other Buyer", address="Iasi")
        no_order_buyer = Buyer(user_id=no_order_buyer_user.id, full_name="No Order Buyer", address="Brasov")
        seller = Seller(user_id=seller_user.id, company_name="Reco Seller")
        category = Category(name="Reco Category")
        session.add_all([buyer, other_buyer, no_order_buyer, seller, category])
        await session.flush()

        products = [
            Product(
                seller_id=seller.id,
                category_id=category.id,
                title=f"Product {idx}",
                description=f"Description {idx}",
                price=Decimal("10.00") + idx,
                stock=20,
                is_available=True,
            )
            for idx in range(1, 7)
        ]
        session.add_all(products)
        await session.flush()

        order1 = Order(
            order_number="ORD-RECO-0001",
            buyer_id=buyer.id,
            seller_id=seller.id,
            status=OrderStatus.PLACED,
            delivery_address={"city": "Cluj"},
            notes=None,
            total=Decimal("31.00"),
        )
        order2 = Order(
            order_number="ORD-RECO-0002",
            buyer_id=other_buyer.id,
            seller_id=seller.id,
            status=OrderStatus.PLACED,
            delivery_address={"city": "Iasi"},
            notes=None,
            total=Decimal("62.00"),
        )
        session.add_all([order1, order2])
        await session.flush()

        session.add_all(
            [
                OrderItem(
                    order_id=order1.id,
                    product_id=products[0].id,
                    product_title=products[0].title,
                    quantity=1,
                    unit_price=products[0].price,
                    subtotal=products[0].price,
                ),
                OrderItem(
                    order_id=order1.id,
                    product_id=products[1].id,
                    product_title=products[1].title,
                    quantity=2,
                    unit_price=products[1].price,
                    subtotal=products[1].price * 2,
                ),
                OrderItem(
                    order_id=order2.id,
                    product_id=products[2].id,
                    product_title=products[2].title,
                    quantity=4,
                    unit_price=products[2].price,
                    subtotal=products[2].price * 4,
                ),
            ]
        )
        await session.commit()

        return {
            "buyer_user_id": buyer_user.id,
            "other_buyer_user_id": other_buyer_user.id,
            "no_order_buyer_user_id": no_order_buyer_user.id,
            "bought_product_ids": [products[0].id, products[1].id],
            "recommended_ids": [products[3].id, products[4].id, products[5].id],
            "popular_top_id": products[2].id,
        }


@pytest.mark.asyncio
async def test_recommendations_personalized_for_logged_in_buyer_with_orders(client: AsyncClient, app, session_factory):
    ids = await seed_recommendation_data(session_factory)
    fake_neo4j = FakeNeo4jService(ids["recommended_ids"])
    app.dependency_overrides[get_neo4j_service] = lambda: fake_neo4j

    response = await client.get(
        "/api/v1/recommendations/products",
        cookies=auth_cookies(ids["buyer_user_id"], "buyer"),
        params={"limit": 2},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["source"] == "personalized"
    assert [item["id"] for item in payload["recommendations"]] == ids["recommended_ids"][:2]
    assert len(fake_neo4j.calls) == 1
    assert set(fake_neo4j.calls[0][0]) == set(ids["bought_product_ids"])
    assert fake_neo4j.calls[0][1] == 2


@pytest.mark.asyncio
async def test_recommendations_fallback_to_popular_when_not_logged_in(client: AsyncClient, app, session_factory):
    ids = await seed_recommendation_data(session_factory)
    fake_neo4j = FakeNeo4jService(ids["recommended_ids"])
    app.dependency_overrides[get_neo4j_service] = lambda: fake_neo4j

    response = await client.get("/api/v1/recommendations/products", params={"limit": 3})

    assert response.status_code == 200
    payload = response.json()
    assert payload["source"] == "popular"
    assert payload["recommendations"][0]["id"] == ids["popular_top_id"]
    assert fake_neo4j.calls == []


@pytest.mark.asyncio
async def test_recommendations_fallback_to_popular_when_buyer_has_no_orders(client: AsyncClient, app, session_factory):
    ids = await seed_recommendation_data(session_factory)
    fake_neo4j = FakeNeo4jService(ids["recommended_ids"])
    app.dependency_overrides[get_neo4j_service] = lambda: fake_neo4j

    response = await client.get(
        "/api/v1/recommendations/products",
        cookies=auth_cookies(ids["no_order_buyer_user_id"], "buyer"),
        params={"limit": 3},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["source"] == "popular"
    assert payload["recommendations"][0]["id"] == ids["popular_top_id"]
    assert fake_neo4j.calls == []
