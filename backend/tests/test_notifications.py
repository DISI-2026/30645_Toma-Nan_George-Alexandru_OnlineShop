from __future__ import annotations

from decimal import Decimal
from uuid import uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from sqlalchemy.orm import selectinload

from application.usecases.notifications import NotificationService
from models import (
    Buyer,
    Category,
    CartItem,
    CartSession,
    Notification,
    NotificationType,
    Order,
    OrderItem,
    OrderStatus,
    Product,
    Review,
    Seller,
    User,
    UserRole,
)
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
                    meta={
                        "order_id": ids["seller_order_id"],
                        "order_number": "ORD-2026-000001",
                    },
                ),
                Notification(
                    user_id=ids["seller_user_id"],
                    type=NotificationType.ORDER_CANCELLED_BY_BUYER,
                    title="Already read",
                    message="Order ORD-2026-000002 was cancelled by the buyer.",
                    is_read=True,
                    meta={
                        "order_id": ids["other_seller_order_id"],
                        "order_number": "ORD-2026-000002",
                    },
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
                    meta={
                        "order_id": ids["seller_order_id"],
                        "order_number": "ORD-2026-000001",
                    },
                ),
            ]
        )
        await session.commit()

    return ids


async def seed_reviewable_product(
    session_factory: async_sessionmaker[AsyncSession],
) -> dict[str, int | str]:
    ids = await seed_order_graph(session_factory)
    async with session_factory() as session:
        order = await session.get(
            Order,
            ids["seller_order_id"],
            options=[selectinload(Order.items).selectinload(OrderItem.product)],
        )
        assert order is not None
        order.status = OrderStatus.DELIVERED
        product = order.items[0].product
        await session.commit()

        return {
            **ids,
            "product_id": product.id,
            "product_slug": product.slug,
            "product_title": product.title,
        }


async def seed_review_for_reply(
    session_factory: async_sessionmaker[AsyncSession],
) -> dict[str, int]:
    async with session_factory() as session:
        seller_user = User(
            email=f"reply-seller-{uuid4().hex}@test.com",
            password_hash="hash",
            role=UserRole.SELLER,
        )
        buyer_user = User(
            email=f"reply-buyer-{uuid4().hex}@test.com",
            password_hash="hash",
            role=UserRole.BUYER,
        )
        session.add_all([seller_user, buyer_user])
        await session.flush()

        seller = Seller(user_id=seller_user.id, company_name="Reply Seller")
        buyer = Buyer(user_id=buyer_user.id, full_name="Reply Buyer")
        category = Category(name=f"Reply Category {uuid4().hex[:8]}")
        session.add_all([seller, buyer, category])
        await session.flush()

        product = Product(
            seller_id=seller.id,
            category_id=category.id,
            title="Reply Product",
            price=Decimal("25.00"),
            stock=10,
        )
        session.add(product)
        await session.flush()

        review = Review(
            user_id=buyer_user.id,
            product_id=product.id,
            rating=5,
            comment="Good.",
        )
        session.add(review)
        await session.commit()

        return {
            "seller_user_id": seller_user.id,
            "buyer_user_id": buyer_user.id,
            "review_id": review.id,
        }


@pytest.mark.asyncio
async def test_notifications_list_returns_paginated_notifications_and_unread_count(
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
    assert [item["title"] for item in payload["notifications"]] == [
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
    assert [item["is_read"] for item in unread_payload["notifications"]] == [
        False,
        False,
    ]


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
    assert read_one.json() == {
        "id": target_notification.id,
        "is_read": True,
        "updated_count": 1,
    }

    read_one_again = await client.patch(
        f"/api/v1/notifications/{target_notification.id}/read",
        cookies=auth_cookies(ids["seller_user_id"], "seller"),
    )
    assert read_one_again.status_code == 200
    assert read_one_again.json()["updated_count"] == 0

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
async def test_order_placement_creates_new_order_notification(
    client: AsyncClient,
    session_factory,
):
    ids = await seed_order_graph(session_factory)

    async with session_factory() as session:
        order = await session.get(
            Order,
            ids["seller_order_id"],
            options=[selectinload(Order.items).selectinload(OrderItem.product)],
        )
        assert order is not None
        product = order.items[0].product

        cart_session = await session.get(CartSession, order.buyer_id)
        if cart_session is None:
            cart_session = CartSession(buyer_id=order.buyer_id)
            session.add(cart_session)
            await session.flush()
        session.add(
            CartItem(
                cart_session_id=cart_session.buyer_id,
                product_id=product.id,
                quantity=1,
                unit_price=product.price,
            )
        )
        await session.commit()

    response = await client.post(
        "/api/v1/orders",
        cookies=auth_cookies(ids["buyer_user_id"], "buyer"),
        json={"delivery_address": "Cluj, Main 1", "notes": None},
    )
    assert response.status_code == 200
    created_order_id = response.json()["orders"][0]["id"]

    async with session_factory() as session:
        notifications = list(
            (
                await session.execute(
                    select(Notification).where(Notification.user_id == ids["seller_user_id"])
                )
            ).scalars()
        )

    assert len(notifications) == 1
    assert notifications[0].type == NotificationType.NEW_ORDER
    assert notifications[0].meta["order_id"] == created_order_id


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
async def test_invalid_status_transition_creates_no_notification(
    client: AsyncClient,
    session_factory,
):
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
async def test_review_creation_creates_seller_notification(
    client: AsyncClient,
    session_factory,
):
    ids = await seed_reviewable_product(session_factory)

    response = await client.post(
        f"/api/v1/products/{ids['product_slug']}/reviews",
        cookies=auth_cookies(ids["buyer_user_id"], "buyer"),
        json={"rating": 5, "comment": "  Excellent product.  "},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["rating"] == 5
    assert payload["comment"] == "Excellent product."

    async with session_factory() as session:
        notifications = list(
            (
                await session.execute(
                    select(Notification).where(Notification.user_id == ids["seller_user_id"])
                )
            ).scalars()
        )

    assert len(notifications) == 1
    assert notifications[0].type == NotificationType.NEW_REVIEW
    assert notifications[0].meta == {
        "review_id": payload["id"],
        "product_id": ids["product_id"],
        "product_title": ids["product_title"],
    }


@pytest.mark.asyncio
async def test_duplicate_review_creates_no_extra_notification(
    client: AsyncClient,
    session_factory,
):
    ids = await seed_reviewable_product(session_factory)
    cookies = auth_cookies(ids["buyer_user_id"], "buyer")

    first_response = await client.post(
        f"/api/v1/products/{ids['product_slug']}/reviews",
        cookies=cookies,
        json={"rating": 5, "comment": "Good."},
    )
    assert first_response.status_code == 200

    duplicate_response = await client.post(
        f"/api/v1/products/{ids['product_slug']}/reviews",
        cookies=cookies,
        json={"rating": 4, "comment": "Again."},
    )
    assert duplicate_response.status_code == 409

    async with session_factory() as session:
        notifications = list((await session.execute(select(Notification))).scalars())

    assert len(notifications) == 1
    assert notifications[0].type == NotificationType.NEW_REVIEW


@pytest.mark.asyncio
async def test_review_reply_creates_buyer_notification_and_duplicate_does_not(
    client: AsyncClient,
    session_factory,
):
    ids = await seed_review_for_reply(session_factory)
    cookies = auth_cookies(ids["seller_user_id"], "seller")

    response = await client.post(
        f"/api/v1/reviews/{ids['review_id']}/reply",
        cookies=cookies,
        json={"comment": "Thanks."},
    )
    assert response.status_code == 200

    duplicate_response = await client.post(
        f"/api/v1/reviews/{ids['review_id']}/reply",
        cookies=cookies,
        json={"comment": "Again."},
    )
    assert duplicate_response.status_code == 409

    async with session_factory() as session:
        notifications = list((await session.execute(select(Notification))).scalars())

    assert len(notifications) == 1
    assert notifications[0].user_id == ids["buyer_user_id"]
    assert notifications[0].type == NotificationType.REVIEW_REPLY


@pytest.mark.asyncio
async def test_notification_service_exposes_reserved_entry_points(session_factory):
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
        service.create_message_notification(
            ids["buyer_user_id"],
            title="Message",
            message="Reserved for future messaging.",
            meta={"thread_id": "demo"},
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
        NotificationType.MESSAGE,
    ]
