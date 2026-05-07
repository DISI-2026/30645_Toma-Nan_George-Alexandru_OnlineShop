from __future__ import annotations

from typing import Any

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from application.dtos.notifications import (
    NotificationItemDTO,
    NotificationListResponseDTO,
    NotificationReadResponseDTO,
)
from models import Notification, NotificationType


class NotificationNotFoundError(Exception):
    pass


class NotificationAccessDeniedError(Exception):
    pass


class NotificationService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def create_new_order_notification(
        self,
        user_id: int,
        *,
        order_id: int,
        order_number: str,
    ) -> Notification:
        return self._create(
            user_id,
            NotificationType.NEW_ORDER,
            title="New order received",
            message=f"Order {order_number} was placed.",
            meta={"order_id": order_id, "order_number": order_number},
        )

    def create_new_review_notification(
        self,
        user_id: int,
        *,
        review_id: int,
        product_id: int,
        product_title: str,
    ) -> Notification:
        return self._create(
            user_id,
            NotificationType.NEW_REVIEW,
            title="New review received",
            message=f"You received a new review for {product_title}.",
            meta={
                "review_id": review_id,
                "product_id": product_id,
                "product_title": product_title,
            },
        )

    def create_review_reply_notification(
        self,
        user_id: int,
        *,
        review_id: int,
        product_id: int,
        product_title: str,
    ) -> Notification:
        return self._create(
            user_id,
            NotificationType.REVIEW_REPLY,
            title="Seller replied to your review",
            message=f"You have a new reply for your review on {product_title}.",
            meta={
                "review_id": review_id,
                "product_id": product_id,
                "product_title": product_title,
            },
        )

    def create_order_status_changed_notification(
        self,
        user_id: int,
        *,
        order_id: int,
        order_number: str,
        status: str,
    ) -> Notification:
        return self._create(
            user_id,
            NotificationType.ORDER_STATUS_CHANGED,
            title="Order status updated",
            message=f"Order {order_number} is now {status}.",
            meta={"order_id": order_id, "order_number": order_number},
        )

    def create_order_cancelled_by_buyer_notification(
        self,
        user_id: int,
        *,
        order_id: int,
        order_number: str,
    ) -> Notification:
        return self._create(
            user_id,
            NotificationType.ORDER_CANCELLED_BY_BUYER,
            title="Order cancelled by buyer",
            message=f"Order {order_number} was cancelled by the buyer.",
            meta={"order_id": order_id, "order_number": order_number},
        )

    def create_order_cancelled_by_seller_notification(
        self,
        user_id: int,
        *,
        order_id: int,
        order_number: str,
    ) -> Notification:
        return self._create(
            user_id,
            NotificationType.ORDER_CANCELLED_BY_SELLER,
            title="Order cancelled by seller",
            message=f"Order {order_number} was cancelled by the seller.",
            meta={"order_id": order_id, "order_number": order_number},
        )

    def create_message_notification(
        self,
        user_id: int,
        *,
        title: str,
        message: str,
        meta: dict[str, Any],
    ) -> Notification:
        return self._create(
            user_id,
            NotificationType.MESSAGE,
            title=title,
            message=message,
            meta=meta,
        )

    def _create(
        self,
        user_id: int,
        notification_type: NotificationType,
        *,
        title: str,
        message: str,
        meta: dict[str, Any],
    ) -> Notification:
        notification = Notification(
            user_id=user_id,
            type=notification_type,
            title=title,
            message=message,
            meta=meta,
        )
        self._session.add(notification)
        return notification


class ListNotificationsUseCase:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def execute(
        self,
        user_id: int,
        unread_only: bool,
        page: int,
        page_size: int,
    ) -> NotificationListResponseDTO:
        filters = [Notification.user_id == user_id]
        if unread_only:
            filters.append(Notification.is_read.is_(False))

        total_statement = select(func.count(Notification.id)).where(*filters)
        total = (await self._session.execute(total_statement)).scalar_one()

        unread_statement = select(func.count(Notification.id)).where(
            Notification.user_id == user_id,
            Notification.is_read.is_(False),
        )
        unread_count = (await self._session.execute(unread_statement)).scalar_one()

        statement = (
            select(Notification)
            .where(*filters)
            .order_by(Notification.created_at.desc(), Notification.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        notifications = list((await self._session.execute(statement)).scalars())

        return NotificationListResponseDTO(
            notifications=[
                NotificationItemDTO.model_validate(notification)
                for notification in notifications
            ],
            unread_count=unread_count,
            page=page,
            page_size=page_size,
            total=total,
        )


class MarkNotificationReadUseCase:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def execute(self, user_id: int, notification_id: int) -> NotificationReadResponseDTO:
        notification = await self._session.get(Notification, notification_id)
        if notification is None:
            raise NotificationNotFoundError("Notification not found.")
        if notification.user_id != user_id:
            raise NotificationAccessDeniedError("You can only update your own notifications.")

        was_unread = not notification.is_read
        notification.is_read = True
        await self._session.commit()

        return NotificationReadResponseDTO(
            id=notification.id,
            is_read=True,
            updated_count=1 if was_unread else 0,
        )


class MarkAllNotificationsReadUseCase:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def execute(self, user_id: int) -> NotificationReadResponseDTO:
        statement = (
            update(Notification)
            .where(
                Notification.user_id == user_id,
                Notification.is_read.is_(False),
            )
            .values(is_read=True)
        )
        result = await self._session.execute(statement)
        await self._session.commit()

        return NotificationReadResponseDTO(
            id=None,
            is_read=True,
            updated_count=int(result.rowcount or 0),
        )
