from __future__ import annotations

from decimal import Decimal
from uuid import uuid4

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from models import Category, Product, Review, Seller, User, UserRole


async def _seed_product(session: AsyncSession, *, title: str, slug: str) -> Product:
    seller_user = User(
        email=f"seller-{uuid4().hex}@test.com",
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
        title=title,
        slug=slug,
        price=Decimal("100.00"),
        stock=10,
    )
    session.add(product)
    await session.flush()
    return product


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
