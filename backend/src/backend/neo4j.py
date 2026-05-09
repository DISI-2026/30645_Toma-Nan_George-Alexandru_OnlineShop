from neo4j import AsyncDriver, AsyncGraphDatabase


class Neo4jConnection:
    def __init__(self, uri, username, password):
        self._uri = uri
        self._username = username
        self._password = password

        self._driver: AsyncDriver | None = None

    async def connect(self, uri, username, password):
        self._driver = AsyncGraphDatabase.driver(uri, auth=(username, password))
        await self._driver.verify_connectivity()
        print("Connected to Neo4j database")

    async def close(self):
        if self._driver is not None:
            await self._driver.close()
        self._driver = None

    def get_driver(self):
        if self._driver is None:
            raise Exception("Neo4j driver is not initialized. Call connect() first.")
        return self._driver
