from __future__ import annotations

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from api.dependencies.auth import require_roles
from api.dependencies.db import get_db_session
from api.exception_handler import handle_route_exceptions
from application.dtos.sales_stats import (
    SalesStatsGroupBy,
    SalesStatsPeriod,
    SalesStatsResponseDTO,
)
from application.usecases.sales_stats import GetSalesStatsUseCase

router = APIRouter(
    prefix="/admin/stats",
    tags=["admin-stats"],
    dependencies=[Depends(require_roles("admin"))],
)


@router.get("/sales", response_model=SalesStatsResponseDTO)
@handle_route_exceptions()
async def get_sales_stats(
    session: Annotated[AsyncSession, Depends(get_db_session)],
    group_by: Annotated[SalesStatsGroupBy, Query()],
    date_from: Annotated[date, Query()],
    date_to: Annotated[date, Query()],
    period: Annotated[SalesStatsPeriod | None, Query()] = None,
) -> SalesStatsResponseDTO:
    use_case = GetSalesStatsUseCase(session)
    return await use_case.execute(group_by, date_from, date_to, period)
