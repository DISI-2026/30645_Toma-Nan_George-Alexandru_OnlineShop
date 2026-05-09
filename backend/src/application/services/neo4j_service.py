from models import Order


class Neo4jService:
    def __init__(self, driver):
        self.driver = driver

    async def get_related_products(self, product_ids: list[int]) -> list[int]:
        if not product_ids:
            return []

        query = """
            MATCH (p:Product)
            WHERE p.id IN $productIds

            MATCH (b:Buyer)-[:Bought]->(p)

            WITH DISTINCT b

            MATCH (b)-[bo:Bought]->(other:Product)
            WHERE NOT other.id IN $productIds

            RETURN
            other.id AS product_id
            ORDER BY bo.bought_on DESC
        """

        result = await self.driver.execute_query(query, {"productIds": product_ids})
        records = result.records
        related_product_ids = [record["product_id"] for record in records]
        return related_product_ids

    async def insert_order(self, order: Order):
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
