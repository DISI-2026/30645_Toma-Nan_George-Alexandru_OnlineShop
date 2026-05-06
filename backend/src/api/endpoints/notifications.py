from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from api.dependencies.auth import AuthContext, require_roles
from api.dependencies.db import get_db_session
from api.exception_handler import handle_route_exceptions
from application.dtos.notifications import (
    NotificationListResponseDTO,
    NotificationReadResponseDTO,
)
from application.usecases.notifications import (
    ListNotificationsUseCase,
    MarkAllNotificationsReadUseCase,
    MarkNotificationReadUseCase,
)

router = APIRouter(tags=["notifications"])


@router.get("/notifications", response_model=NotificationListResponseDTO)
@handle_route_exceptions()
async def list_notifications(
    auth_context: Annotated[AuthContext, Depends(require_roles("seller", "buyer"))],
    session: Annotated[AsyncSession, Depends(get_db_session)],
    unread_only: Annotated[bool, Query()] = False,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> NotificationListResponseDTO:
    use_case = ListNotificationsUseCase(session)
    return await use_case.execute(auth_context.user_id, unread_only, page, page_size)


@router.patch("/notifications/read-all", response_model=NotificationReadResponseDTO)
@handle_route_exceptions()
async def mark_all_notifications_read(
    auth_context: Annotated[AuthContext, Depends(require_roles("seller", "buyer"))],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> NotificationReadResponseDTO:
    use_case = MarkAllNotificationsReadUseCase(session)
    return await use_case.execute(auth_context.user_id)


@router.patch("/notifications/{notification_id}/read", response_model=NotificationReadResponseDTO)
@handle_route_exceptions()
async def mark_notification_read(
    notification_id: int,
    auth_context: Annotated[AuthContext, Depends(require_roles("seller", "buyer"))],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> NotificationReadResponseDTO:
    use_case = MarkNotificationReadUseCase(session)
    return await use_case.execute(auth_context.user_id, notification_id)
