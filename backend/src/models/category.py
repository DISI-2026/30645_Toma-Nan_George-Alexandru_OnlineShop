from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from slugify import slugify
from sqlalchemy import DateTime, ForeignKey, String, Text, event, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .buyer_category_preference import buyer_category_preferences
from .seller_category import seller_categories

if TYPE_CHECKING:
    from .buyer import Buyer
    from .product import Product
    from .seller import Seller


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    slug: Mapped[str] = mapped_column(String(220), unique=True, nullable=False)
    parent_id: Mapped[int | None] = mapped_column(
        ForeignKey("categories.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    parent: Mapped[Category | None] = relationship(
        "Category",
        remote_side="Category.id",
        back_populates="children",
    )
    children: Mapped[list[Category]] = relationship(
        "Category",
        back_populates="parent",
    )
    preferred_by_buyers: Mapped[list[Buyer]] = relationship(
        secondary=buyer_category_preferences,
        back_populates="preferred_categories",
    )
    sellers: Mapped[list[Seller]] = relationship(
        secondary=seller_categories,
        back_populates="categories",
    )
    products: Mapped[list[Product]] = relationship(back_populates="category")


@event.listens_for(Category, "before_insert")
def populate_category_slug(_: object, __: object, target: Category) -> None:
    if target.slug:
        return

    base = slugify(target.name or "", max_length=220).strip("-")
    target.slug = base or "category"
