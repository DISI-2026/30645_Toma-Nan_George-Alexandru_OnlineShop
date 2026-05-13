from fastapi import Request

from application.services.neo4j_service import Neo4jService
from backend.neo4j import Neo4jConnection


async def get_neo4j_service(request: Request) -> Neo4jService:
    connection = getattr(request.app.state, "neo4j", None)
    if not isinstance(connection, Neo4jConnection):
        raise RuntimeError("Neo4j connection is not configured.")
    return Neo4jService(connection.get_driver())


async def get_optional_neo4j_service(request: Request) -> Neo4jService | None:
    connection = getattr(request.app.state, "neo4j", None)
    if not isinstance(connection, Neo4jConnection):
        return None
    return Neo4jService(connection.get_driver())
