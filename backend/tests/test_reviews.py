from __future__ import annotations

from datetime import UTC, datetime
from decimal import Decimal
from uuid import uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from api.dependencies.auth import ACCESS_TOKEN_COOKIE_NAME
from application.security import create_access_token
from models import Category, Product, Review, Seller, User, UserRole


def auth_cookies(user_id: int, role: str) -> dict[str, str]:
    token = create_access_token(
        user_id=user_id,
        role=role,
        secret_key="test-secret",
        expires_in_minutes=60,
    )
    return {ACCESS_TOKEN_COOKIE_NAME: token}


async def _seed_seller_product(
    session: AsyncSession,
    *,
    email_prefix: str = "seller",
    title: str | None = None,
    slug: str,
) -> tuple[User, Seller, Product]:
    seller_user = User(
        email=f"{email_prefix}-{uuid4().hex}@test.com",
        password_hash="hash",
        role=UserRole.SELLER,
    )
    session.add(seller_user)
    await session.flush()

    seller = Seller(user_id=seller_user.id, company_name=f"Seller {uuid4().hex[:8]}")
    session.add(seller)
    await session.flush()

    category = Category(name=f"Category {uuid4().hex[:8]}")
    session.add(category)
    await session.flush()

    product = Product(
        seller_id=seller.id,
        category_id=category.id,
        title=title or f"Product {uuid4().hex[:8]}",
        slug=slug,
        price=Decimal("100.00"),
        stock=10,
    )
    session.add(product)
    await session.flush()
    return seller_user, seller, product


async def _seed_product(session: AsyncSession, *, title: str, slug: str) -> Product:
    _, _, product = await _seed_seller_product(session, title=title, slug=slug)
    return product


async def _seed_review(
    session_factory: async_sessionmaker[AsyncSession],
    *,
    reply: str | None = None,
) -> tuple[User, Review]:
    async with session_factory() as session:
        seller_user, _, product = await _seed_seller_product(
            session,
            email_prefix="seller",
            slug=f"reviewed-product-{uuid4().hex}",
        )
        buyer = User(
            email=f"buyer-{uuid4().hex}@test.com",
            password_hash="hash",
            role=UserRole.BUYER,
        )
        session.add(buyer)
        await session.flush()

        review = Review(
            user_id=buyer.id,
            product_id=product.id,
            rating=4,
            comment="Good product.",
            seller_reply=reply,
        )
        if reply is not None:
            review.reply_date = datetime.now(UTC)

        session.add(review)
        await session.commit()
        await session.refresh(seller_user)
        await session.refresh(review)
        return seller_user, review


@pytest.mark.asyncio
async def test_seller_can_reply_to_review(
    client: AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
):
    seller_user, review = await _seed_review(session_factory)

    response = await client.post(
        f"/api/v1/reviews/{review.id}/reply",
        cookies=auth_cookies(seller_user.id, "seller"),
        json={"comment": "  Thanks for your feedback.  "},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["id"] == review.id
    assert payload["seller_reply"]["comment"] == "Thanks for your feedback."
    assert payload["seller_reply"]["replied_at"] is not None

    async with session_factory() as session:
        saved_review = await session.get(Review, review.id)
        assert saved_review is not None
        assert saved_review.seller_reply == "Thanks for your feedback."
        assert saved_review.reply_date is not None


@pytest.mark.asyncio
async def test_reply_to_review_rejects_empty_comment(
    client: AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
):
    seller_user, review = await _seed_review(session_factory)

    response = await client.post(
        f"/api/v1/reviews/{review.id}/reply",
        cookies=auth_cookies(seller_user.id, "seller"),
        json={"comment": "   "},
    )

    assert response.status_code == 400


@pytest.mark.asyncio
async def test_reply_to_review_rejects_long_comment(
    client: AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
):
    seller_user, review = await _seed_review(session_factory)

    response = await client.post(
        f"/api/v1/reviews/{review.id}/reply",
        cookies=auth_cookies(seller_user.id, "seller"),
        json={"comment": "x" * 1001},
    )

    assert response.status_code == 400


@pytest.mark.asyncio
async def test_seller_cannot_reply_to_other_seller_product_review(
    client: AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
):
    _, review = await _seed_review(session_factory)

    async with session_factory() as session:
        other_seller_user, _, _ = await _seed_seller_product(
            session,
            email_prefix="other-seller",
            slug=f"other-product-{uuid4().hex}",
        )
        await session.commit()
        await session.refresh(other_seller_user)

    response = await client.post(
        f"/api/v1/reviews/{review.id}/reply",
        cookies=auth_cookies(other_seller_user.id, "seller"),
        json={"comment": "This is not my product."},
    )

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_reply_to_review_is_immutable(
    client: AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
):
    seller_user, review = await _seed_review(session_factory, reply="Already answered.")

    response = await client.post(
        f"/api/v1/reviews/{review.id}/reply",
        cookies=auth_cookies(seller_user.id, "seller"),
        json={"comment": "Trying to edit."},
    )

    assert response.status_code == 409


@pytest.mark.asyncio
async def test_reply_to_missing_review_returns_404(
    client: AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
):
    seller_user, _ = await _seed_review(session_factory)

    response = await client.post(
        "/api/v1/reviews/999999/reply",
        cookies=auth_cookies(seller_user.id, "seller"),
        json={"comment": "No review here."},
    )

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_review_insert_updates_product_aggregates(
    session_factory: async_sessionmaker[AsyncSession],
):
    async with session_factory() as session:
        product = await _seed_product(session, title="Phone", slug="phone-review-insert")
        reviewer = User(
            email=f"buyer-{uuid4().hex}@test.com",
            password_hash="hash",
            role=UserRole.BUYER,
        )
        session.add(reviewer)
        await session.flush()

        session.add(Review(user_id=reviewer.id, product_id=product.id, rating=4))
        await session.commit()

        await session.refresh(product)
        assert float(product.avg_rating) == pytest.approx(4.0)
        assert product.review_count == 1


@pytest.mark.asyncio
async def test_review_delete_updates_product_aggregates(
    session_factory: async_sessionmaker[AsyncSession],
):
    async with session_factory() as session:
        product = await _seed_product(session, title="Tablet", slug="tablet-review-delete")
        reviewer = User(
            email=f"buyer-{uuid4().hex}@test.com",
            password_hash="hash",
            role=UserRole.BUYER,
        )
        session.add(reviewer)
        await session.flush()

        review = Review(user_id=reviewer.id, product_id=product.id, rating=5)
        session.add(review)
        await session.commit()

        await session.delete(review)
        await session.commit()

        await session.refresh(product)
        assert float(product.avg_rating) == pytest.approx(0.0)
        assert product.review_count == 0


@pytest.mark.asyncio
async def test_review_rating_update_updates_product_average(
    session_factory: async_sessionmaker[AsyncSession],
):
    async with session_factory() as session:
        product = await _seed_product(session, title="Laptop", slug="laptop-review-update")
        reviewer = User(
            email=f"buyer-{uuid4().hex}@test.com",
            password_hash="hash",
            role=UserRole.BUYER,
        )
        session.add(reviewer)
        await session.flush()

        review = Review(user_id=reviewer.id, product_id=product.id, rating=2)
        session.add(review)
        await session.commit()

        review.rating = 5
        await session.commit()

        await session.refresh(product)
        assert float(product.avg_rating) == pytest.approx(5.0)
        assert product.review_count == 1


@pytest.mark.asyncio
async def test_review_product_move_updates_old_and_new_product_aggregates(
    session_factory: async_sessionmaker[AsyncSession],
):
    async with session_factory() as session:
        product_a = await _seed_product(session, title="Camera A", slug="camera-a-review-move")
        product_b = await _seed_product(session, title="Camera B", slug="camera-b-review-move")
        reviewer = User(
            email=f"buyer-{uuid4().hex}@test.com",
            password_hash="hash",
            role=UserRole.BUYER,
        )
        session.add(reviewer)
        await session.flush()

        review = Review(user_id=reviewer.id, product_id=product_a.id, rating=3)
        session.add(review)
        await session.commit()

        review.product_id = product_b.id
        await session.commit()

        await session.refresh(product_a)
        await session.refresh(product_b)
        assert float(product_a.avg_rating) == pytest.approx(0.0)
        assert product_a.review_count == 0
        assert float(product_b.avg_rating) == pytest.approx(3.0)
        assert product_b.review_count == 1


@pytest.mark.asyncio
async def test_unique_review_per_user_per_product_is_enforced(
    session_factory: async_sessionmaker[AsyncSession],
):
    async with session_factory() as session:
        product = await _seed_product(session, title="Watch", slug="watch-review-unique")
        reviewer = User(
            email=f"buyer-{uuid4().hex}@test.com",
            password_hash="hash",
            role=UserRole.BUYER,
        )
        session.add(reviewer)
        await session.flush()

        session.add(Review(user_id=reviewer.id, product_id=product.id, rating=4))
        await session.commit()

        session.add(Review(user_id=reviewer.id, product_id=product.id, rating=5))
        with pytest.raises(IntegrityError):
            await session.commit()
        await session.rollback()


@pytest.mark.asyncio
async def test_rating_check_constraint_is_enforced(
    session_factory: async_sessionmaker[AsyncSession],
):
    async with session_factory() as session:
        product = await _seed_product(session, title="Speaker", slug="speaker-review-rating-check")
        reviewer = User(
            email=f"buyer-{uuid4().hex}@test.com",
            password_hash="hash",
            role=UserRole.BUYER,
        )
        session.add(reviewer)
        await session.flush()

        session.add(Review(user_id=reviewer.id, product_id=product.id, rating=0))
        with pytest.raises(IntegrityError):
            await session.commit()
        await session.rollback()


@pytest.mark.asyncio
async def test_comment_length_check_constraint_is_enforced(
    session_factory: async_sessionmaker[AsyncSession],
):
    async with session_factory() as session:
        product = await _seed_product(session, title="Monitor", slug="monitor-review-comment-check")
        reviewer = User(
            email=f"buyer-{uuid4().hex}@test.com",
            password_hash="hash",
            role=UserRole.BUYER,
        )
        session.add(reviewer)
        await session.flush()

        session.add(
            Review(
                user_id=reviewer.id,
                product_id=product.id,
                rating=4,
                comment="x" * 2001,
            )
        )
        with pytest.raises(IntegrityError):
            await session.commit()
        await session.rollback()
