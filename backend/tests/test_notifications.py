from __future__ import annotations

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from application.usecases.notifications import NotificationService
from models import Notification, NotificationType
from tests.test_orders import auth_cookies, seed_order_graph


async def seed_notifications(session_factory) -> dict[str, int]:
    ids = await seed_order_graph(session_factory)

    async with session_factory() as session:
        session.add_all(
            [
                Notification(
                    user_id=ids["seller_user_id"],
                    type=NotificationType.NEW_ORDER,
                    title="Old unread",
                    message="Order ORD-2026-000001 was placed.",
                    is_read=False,
                    meta={"order_id": ids["seller_order_id"], "order_number": "ORD-2026-000001"},
                ),
                Notification(
                    user_id=ids["seller_user_id"],
                    type=NotificationType.ORDER_CANCELLED_BY_BUYER,
                    title="Already read",
                    message="Order ORD-2026-000002 was cancelled by the buyer.",
                    is_read=True,
                    meta={"order_id": ids["other_seller_order_id"], "order_number": "ORD-2026-000002"},
                ),
                Notification(
                    user_id=ids["seller_user_id"],
                    type=NotificationType.MESSAGE,
                    title="Newest unread",
                    message="A seller message placeholder exists.",
                    is_read=False,
                    meta={"thread_id": "demo-thread"},
                ),
                Notification(
                    user_id=ids["buyer_user_id"],
                    type=NotificationType.ORDER_STATUS_CHANGED,
                    title="Buyer-only notification",
                    message="Order ORD-2026-000001 is now confirmed.",
                    is_read=False,
                    meta={"order_id": ids["seller_order_id"], "order_number": "ORD-2026-000001"},
                ),
            ]
        )
        await session.commit()

    return ids


@pytest.mark.asyncio
async def test_notifications_list_returns_paginated_items_and_unread_count(
    client: AsyncClient,
    session_factory,
):
    ids = await seed_notifications(session_factory)

    response = await client.get(
        "/api/v1/notifications",
        cookies=auth_cookies(ids["seller_user_id"], "seller"),
        params={"page": 1, "page_size": 10},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == 3
    assert payload["unread_count"] == 2
    assert payload["page"] == 1
    assert payload["page_size"] == 10
    assert [item["title"] for item in payload["items"]] == [
        "Newest unread",
        "Already read",
        "Old unread",
    ]

    unread_only = await client.get(
        "/api/v1/notifications",
        cookies=auth_cookies(ids["seller_user_id"], "seller"),
        params={"unread_only": "true"},
    )
    assert unread_only.status_code == 200
    unread_payload = unread_only.json()
    assert unread_payload["total"] == 2
    assert unread_payload["unread_count"] == 2
    assert [item["is_read"] for item in unread_payload["items"]] == [False, False]


@pytest.mark.asyncio
async def test_notification_read_endpoints_enforce_auth_and_ownership(
    client: AsyncClient,
    session_factory,
):
    ids = await seed_notifications(session_factory)

    async with session_factory() as session:
        seller_notification = (
            await session.execute(
                select(Notification).where(Notification.user_id == ids["seller_user_id"])
            )
        ).scalars().first()
        assert seller_notification is not None

    unauthenticated = await client.get("/api/v1/notifications")
    assert unauthenticated.status_code == 401

    forbidden = await client.patch(
        f"/api/v1/notifications/{seller_notification.id}/read",
        cookies=auth_cookies(ids["buyer_user_id"], "buyer"),
    )
    assert forbidden.status_code == 403

    missing = await client.patch(
        "/api/v1/notifications/999999/read",
        cookies=auth_cookies(ids["seller_user_id"], "seller"),
    )
    assert missing.status_code == 404


@pytest.mark.asyncio
async def test_mark_notification_read_and_read_all_update_only_owned_rows(
    client: AsyncClient,
    session_factory,
):
    ids = await seed_notifications(session_factory)

    async with session_factory() as session:
        notifications = list(
            (
                await session.execute(
                    select(Notification)
                    .where(Notification.user_id == ids["seller_user_id"])
                    .order_by(Notification.id.asc())
                )
            ).scalars()
        )
        target_notification = notifications[0]

    read_one = await client.patch(
        f"/api/v1/notifications/{target_notification.id}/read",
        cookies=auth_cookies(ids["seller_user_id"], "seller"),
    )
    assert read_one.status_code == 200
    assert read_one.json() == {"id": target_notification.id, "is_read": True, "updated_count": 1}

    read_one_again = await client.patch(
        f"/api/v1/notifications/{target_notification.id}/read",
        cookies=auth_cookies(ids["seller_user_id"], "seller"),
    )
    assert read_one_again.status_code == 200
    assert read_one_again.json()["updated_count"] == 1

    read_all = await client.patch(
        "/api/v1/notifications/read-all",
        cookies=auth_cookies(ids["seller_user_id"], "seller"),
    )
    assert read_all.status_code == 200
    assert read_all.json() == {"id": None, "is_read": True, "updated_count": 1}

    read_all_again = await client.patch(
        "/api/v1/notifications/read-all",
        cookies=auth_cookies(ids["seller_user_id"], "seller"),
    )
    assert read_all_again.status_code == 200
    assert read_all_again.json()["updated_count"] == 0

    async with session_factory() as session:
        seller_notifications = list(
            (
                await session.execute(
                    select(Notification).where(Notification.user_id == ids["seller_user_id"])
                )
            ).scalars()
        )
        buyer_notifications = list(
            (
                await session.execute(
                    select(Notification).where(Notification.user_id == ids["buyer_user_id"])
                )
            ).scalars()
        )

    assert all(notification.is_read for notification in seller_notifications)
    assert buyer_notifications[0].is_read is False


@pytest.mark.asyncio
async def test_seller_status_change_creates_order_status_changed_notification(
    client: AsyncClient,
    session_factory,
):
    ids = await seed_order_graph(session_factory)

    response = await client.patch(
        f"/api/v1/orders/{ids['seller_order_id']}/status",
        cookies=auth_cookies(ids["seller_user_id"], "seller"),
        json={"status": "confirmed"},
    )
    assert response.status_code == 200

    async with session_factory() as session:
        notifications = list(
            (
                await session.execute(
                    select(Notification).where(Notification.user_id == ids["buyer_user_id"])
                )
            ).scalars()
        )

    assert len(notifications) == 1
    assert notifications[0].type == NotificationType.ORDER_STATUS_CHANGED
    assert notifications[0].meta == {
        "order_id": ids["seller_order_id"],
        "order_number": "ORD-2026-000001",
    }


@pytest.mark.asyncio
async def test_buyer_cancel_creates_notification_for_seller(client: AsyncClient, session_factory):
    ids = await seed_order_graph(session_factory)

    response = await client.patch(
        f"/api/v1/orders/{ids['seller_order_id']}/status",
        cookies=auth_cookies(ids["buyer_user_id"], "buyer"),
        json={"status": "cancelled"},
    )
    assert response.status_code == 200

    async with session_factory() as session:
        notifications = list(
            (
                await session.execute(
                    select(Notification).where(Notification.user_id == ids["seller_user_id"])
                )
            ).scalars()
        )

    assert len(notifications) == 1
    assert notifications[0].type == NotificationType.ORDER_CANCELLED_BY_BUYER


@pytest.mark.asyncio
async def test_seller_cancel_creates_notification_for_buyer(client: AsyncClient, session_factory):
    ids = await seed_order_graph(session_factory)
    cookies = auth_cookies(ids["seller_user_id"], "seller")

    confirm_response = await client.patch(
        f"/api/v1/orders/{ids['seller_order_id']}/status",
        cookies=cookies,
        json={"status": "confirmed"},
    )
    assert confirm_response.status_code == 200

    cancel_response = await client.patch(
        f"/api/v1/orders/{ids['seller_order_id']}/status",
        cookies=cookies,
        json={"status": "cancelled"},
    )
    assert cancel_response.status_code == 200

    async with session_factory() as session:
        notifications = list(
            (
                await session.execute(
                    select(Notification)
                    .where(Notification.user_id == ids["buyer_user_id"])
                    .order_by(Notification.id.asc())
                )
            ).scalars()
        )

    assert [notification.type for notification in notifications] == [
        NotificationType.ORDER_STATUS_CHANGED,
        NotificationType.ORDER_CANCELLED_BY_SELLER,
    ]


@pytest.mark.asyncio
async def test_invalid_status_transition_creates_no_notification(client: AsyncClient, session_factory):
    ids = await seed_order_graph(session_factory)

    response = await client.patch(
        f"/api/v1/orders/{ids['seller_order_id']}/status",
        cookies=auth_cookies(ids["buyer_user_id"], "buyer"),
        json={"status": "confirmed"},
    )
    assert response.status_code == 422

    async with session_factory() as session:
        notifications = list((await session.execute(select(Notification))).scalars())

    assert notifications == []


@pytest.mark.asyncio
async def test_notification_service_exposes_future_story_entry_points(session_factory):
    ids = await seed_order_graph(session_factory)

    async with session_factory() as session:
        service = NotificationService(session)
        service.create_new_order_notification(
            ids["seller_user_id"],
            order_id=ids["seller_order_id"],
            order_number="ORD-2026-000001",
        )
        service.create_new_review_notification(
            ids["seller_user_id"],
            review_id=7,
            product_id=11,
            product_title="Laptop",
        )
        service.create_review_reply_notification(
            ids["buyer_user_id"],
            review_id=7,
            product_id=11,
            product_title="Laptop",
        )
        await session.commit()

        notifications = list(
            (
                await session.execute(select(Notification).order_by(Notification.id.asc()))
            ).scalars()
        )

    assert [notification.type for notification in notifications] == [
        NotificationType.NEW_ORDER,
        NotificationType.NEW_REVIEW,
        NotificationType.REVIEW_REPLY,
    ]
    assert notifications[1].meta == {
        "review_id": 7,
        "product_id": 11,
        "product_title": "Laptop",
    }
