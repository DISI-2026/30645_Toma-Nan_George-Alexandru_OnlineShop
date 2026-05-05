from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    DDL,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    Text,
    UniqueConstraint,
    event,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .product import Product
    from .user import User


class Review(Base):
    __tablename__ = "reviews"
    __table_args__ = (
        UniqueConstraint("user_id", "product_id", name="uq_reviews_user_product"),
        CheckConstraint("rating >= 1 AND rating <= 5", name="ck_reviews_rating_range"),
        CheckConstraint("comment IS NULL OR length(comment) <= 2000", name="ck_reviews_comment_len"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    seller_reply: Mapped[str | None] = mapped_column(Text, nullable=True)
    reply_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    user: Mapped[User] = relationship(back_populates="reviews")
    product: Mapped[Product] = relationship(back_populates="reviews")


event.listen(
    Base.metadata,
    "after_create",
    DDL(
        """
        CREATE OR REPLACE FUNCTION refresh_product_rating(p_product_id INT)
        RETURNS VOID AS $$
        BEGIN
            UPDATE products
            SET
                avg_rating = (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE product_id = p_product_id),
                review_count = (SELECT COUNT(*) FROM reviews WHERE product_id = p_product_id)
            WHERE id = p_product_id;
        END;
        $$ LANGUAGE plpgsql;
        """
    ).execute_if(dialect="postgresql"),
)

event.listen(
    Base.metadata,
    "after_create",
    DDL(
        """
        CREATE OR REPLACE FUNCTION reviews_aggregate_trigger()
        RETURNS TRIGGER AS $$
        BEGIN
            IF TG_OP = 'INSERT' THEN
                PERFORM refresh_product_rating(NEW.product_id);
            ELSIF TG_OP = 'DELETE' THEN
                PERFORM refresh_product_rating(OLD.product_id);
            ELSE
                PERFORM refresh_product_rating(NEW.product_id);
                IF NEW.product_id <> OLD.product_id THEN
                    PERFORM refresh_product_rating(OLD.product_id);
                END IF;
            END IF;
            RETURN NULL;
        END;
        $$ LANGUAGE plpgsql;
        """
    ).execute_if(dialect="postgresql"),
)

event.listen(
    Review.__table__,
    "after_create",
    DDL(
        """
        DROP TRIGGER IF EXISTS reviews_aggregate_aiud ON reviews;
        CREATE TRIGGER reviews_aggregate_aiud
        AFTER INSERT OR DELETE OR UPDATE OF rating, product_id ON reviews
        FOR EACH ROW
        EXECUTE FUNCTION reviews_aggregate_trigger();
        """
    ).execute_if(dialect="postgresql"),
)

event.listen(
    Review.__table__,
    "before_drop",
    DDL("DROP TRIGGER IF EXISTS reviews_aggregate_aiud ON reviews;").execute_if(dialect="postgresql"),
)

event.listen(
    Base.metadata,
    "after_drop",
    DDL("DROP FUNCTION IF EXISTS reviews_aggregate_trigger();").execute_if(dialect="postgresql"),
)

event.listen(
    Base.metadata,
    "after_drop",
    DDL("DROP FUNCTION IF EXISTS refresh_product_rating(INT);").execute_if(dialect="postgresql"),
)
