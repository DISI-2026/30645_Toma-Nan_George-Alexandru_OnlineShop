from __future__ import annotations

import os
from datetime import UTC, datetime

import pytest
import pytest_asyncio
from neo4j import AsyncGraphDatabase

from application.services.neo4j_service import Neo4jService
from models import Order, OrderItem


def _neo4j_env() -> tuple[str, str, str, str | None]:
    uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    username = os.getenv("NEO4J_USERNAME", "neo4j")
    password = os.getenv("NEO4J_PASSWORD", "neo4jpwd")
    database = os.getenv("NEO4J_DATABASE")
    return uri, username, password, database


@pytest_asyncio.fixture
async def neo4j_driver():
    uri, username, password, _ = _neo4j_env()
    driver = AsyncGraphDatabase.driver(uri, auth=(username, password))
    try:
        await driver.verify_connectivity()
    except Exception as exc:  # pragma: no cover - env dependent
        await driver.close()
        pytest.skip(f"Neo4j not reachable at {uri}: {exc}")
    try:
        yield driver
    finally:
        await driver.close()


@pytest_asyncio.fixture(autouse=True)
async def clean_graph(neo4j_driver):
    _, _, _, database = _neo4j_env()
    kwargs = {"database_": database} if database else {}
    await neo4j_driver.execute_query("MATCH (n) DETACH DELETE n", **kwargs)
    yield
    await neo4j_driver.execute_query("MATCH (n) DETACH DELETE n", **kwargs)


@pytest_asyncio.fixture
async def neo4j_service(neo4j_driver) -> Neo4jService:
    return Neo4jService(neo4j_driver)


async def _query_records(driver, query: str, params: dict | None = None):
    _, _, _, database = _neo4j_env()
    kwargs = {"database_": database} if database else {}
    result = await driver.execute_query(query, params or {}, **kwargs)
    return result.records


def _build_order(buyer_id: int, product_ids: list[int], placed_at: datetime | None = None) -> Order:
    order = Order(
        buyer_id=buyer_id,
        placed_at=placed_at or datetime.now(UTC),
    )
    order.items = [OrderItem(product_id=product_id) for product_id in product_ids]
    return order


@pytest.mark.asyncio
async def test_insert_order_creates_buyer_product_and_bought_edges(neo4j_driver, neo4j_service: Neo4jService):
    order = _build_order(buyer_id=101, product_ids=[11, 22, 33], placed_at=datetime(2026, 1, 15, 10, 0, tzinfo=UTC))

    await neo4j_service.insert_order(order)

    buyer_records = await _query_records(
        neo4j_driver,
        "MATCH (b:Buyer {id: $buyerId}) RETURN count(b) AS count",
        {"buyerId": 101},
    )
    assert buyer_records[0]["count"] == 1

    product_records = await _query_records(
        neo4j_driver,
        "MATCH (p:Product) RETURN collect(p.id) AS product_ids",
    )
    assert set(product_records[0]["product_ids"]) == {11, 22, 33}

    rel_records = await _query_records(
        neo4j_driver,
        """
        MATCH (:Buyer {id: $buyerId})-[r:Bought]->(p:Product)
        RETURN count(r) AS rel_count, collect(p.id) AS related_product_ids
        """,
        {"buyerId": 101},
    )
    assert rel_records[0]["rel_count"] == 3
    assert set(rel_records[0]["related_product_ids"]) == {11, 22, 33}


@pytest.mark.asyncio
async def test_get_related_products_returns_co_bought_products(neo4j_service: Neo4jService):
    await neo4j_service.insert_order(_build_order(buyer_id=1, product_ids=[10, 20]))
    await neo4j_service.insert_order(_build_order(buyer_id=2, product_ids=[10, 30]))
    await neo4j_service.insert_order(_build_order(buyer_id=3, product_ids=[10, 40]))

    related = await neo4j_service.get_related_products([10], limit=10)

    assert {20, 30, 40}.issubset(set(related))


@pytest.mark.asyncio
async def test_get_related_products_excludes_input_product_ids(neo4j_service: Neo4jService):
    await neo4j_service.insert_order(_build_order(buyer_id=1, product_ids=[100, 200, 300]))
    await neo4j_service.insert_order(_build_order(buyer_id=2, product_ids=[100, 400]))

    related = await neo4j_service.get_related_products([100, 200], limit=10)

    assert 100 not in related
    assert 200 not in related
    assert 300 in related
    assert 400 in related


@pytest.mark.asyncio
async def test_get_related_products_empty_input_returns_empty_list(neo4j_service: Neo4jService):
    await neo4j_service.insert_order(_build_order(buyer_id=1, product_ids=[1, 2]))

    related = await neo4j_service.get_related_products([], limit=10)

    assert related == []
