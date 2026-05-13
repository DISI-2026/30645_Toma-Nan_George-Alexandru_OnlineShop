from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from api.dependencies.auth import AuthContext, get_optional_auth_context
from api.dependencies.db import get_db_session
from api.dependencies.neo4j import get_neo4j_service
from api.exception_handler import handle_route_exceptions
from application.dtos.products import GetProductRecommendationsResponseDTO
from application.services.neo4j_service import Neo4jService
from application.usecases.products import GetProductRecommendationsUseCase

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.get("/products", response_model=GetProductRecommendationsResponseDTO)
@handle_route_exceptions()
async def get_product_recommendations(
    session: Annotated[AsyncSession, Depends(get_db_session)],
    neo4j_service: Annotated[Neo4jService, Depends(get_neo4j_service)],
    auth_context: Annotated[AuthContext | None, Depends(get_optional_auth_context)],
    limit: Annotated[int, Query(ge=1, le=20)] = 10,
) -> GetProductRecommendationsResponseDTO:
    use_case = GetProductRecommendationsUseCase(session, neo4j_service)
    return await use_case.execute(
        limit=limit,
        user_id=auth_context.user_id if auth_context is not None else None,
        role=auth_context.role if auth_context is not None else None,
    )
