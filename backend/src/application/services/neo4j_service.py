from models import Order
from sqlalchemy import inspect


class Neo4jService:
    def __init__(self, driver):
        self.driver = driver

    async def get_related_products(
        self, product_ids: list[int], limit: int
    ) -> list[int]:
        if not product_ids or limit <= 0:
            return []

        query = """
            MATCH (p:Product)
            WHERE p.id IN $productIds

            MATCH (b:Buyer)-[:Bought]->(p)

            WITH DISTINCT b

            MATCH (b)-[bo:Bought]->(other:Product)
            WHERE NOT other.id IN $productIds

            WITH other, max(bo.bought_on) AS last_bought_on

            RETURN
            other.id AS product_id
            ORDER BY last_bought_on DESC
            LIMIT $limit
        """

        result = await self.driver.execute_query(
            query,
            {"productIds": product_ids, "limit": limit},
        )
        records = result.records
        related_product_ids = [record["product_id"] for record in records]
        return related_product_ids

    async def insert_order(self, order: Order):
        if "items" in inspect(order).unloaded:
            raise ValueError(
                "Order.items must be eagerly loaded before calling insert_order()."
            )

        query = """
            UNWIND $productIds AS productId

            MERGE (b:Buyer {id: $buyerId})
            MERGE (p:Product {id: productId})

            MERGE (b)-[bo:Bought {bought_on: datetime($boughtOn)}]->(p)
        """

        await self.driver.execute_query(
            query,
            {
                "buyerId": order.buyer_id,
                "boughtOn": order.placed_at.isoformat(),
                "productIds": [item.product_id for item in order.items],
            },
        )
