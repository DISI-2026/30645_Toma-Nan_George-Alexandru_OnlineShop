from __future__ import annotations

import asyncio

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine

from models import Base
import models  # noqa: F401

from .db import connect, disconnect


async def _create_triggers(connection: AsyncConnection) -> None:
    await connection.execute(
        text("""
            CREATE OR REPLACE FUNCTION update_updated_at()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = NOW();
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        """)
    )
    
    await connection.execute(
        text("DROP TRIGGER IF EXISTS products_updated_at ON products;")
    )
    await connection.execute(
        text("""
            CREATE TRIGGER products_updated_at
            BEFORE UPDATE ON products
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at();
        """)
    )
    
    await connection.execute(
        text("""
            CREATE OR REPLACE FUNCTION enforce_max_product_images()
            RETURNS TRIGGER AS $$
            DECLARE
                image_count INT;
            BEGIN
                SELECT COUNT(*) INTO image_count
                FROM product_images
                WHERE product_id = NEW.product_id;
                
                IF image_count >= 10 THEN
                    RAISE EXCEPTION 'Product cannot have more than 10 images';
                END IF;
                
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        """)
    )
    
    await connection.execute(
        text("DROP TRIGGER IF EXISTS check_max_product_images ON product_images;")
    )
    await connection.execute(
        text("""
            CREATE TRIGGER check_max_product_images
            BEFORE INSERT ON product_images
            FOR EACH ROW
            EXECUTE FUNCTION enforce_max_product_images();
        """)
    )
    
    await connection.execute(
        text("""
            CREATE OR REPLACE FUNCTION refresh_product_rating(p_product_id INT)
            RETURNS VOID AS $$
            BEGIN
                UPDATE products
                SET
                    avg_rating = (
                        SELECT COALESCE(AVG(rating), 0)
                        FROM reviews
                        WHERE product_id = p_product_id
                    ),
                    review_count = (
                        SELECT COUNT(*)
                        FROM reviews
                        WHERE product_id = p_product_id
                    )
                WHERE id = p_product_id;
            END;
            $$ LANGUAGE plpgsql;
        """)
    )

    await connection.execute(
        text("""
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
        """)
    )

    await connection.execute(
        text("DROP TRIGGER IF EXISTS reviews_aggregate_aiud ON reviews;")
    )
    await connection.execute(
        text("""
            CREATE TRIGGER reviews_aggregate_aiud
            AFTER INSERT OR DELETE OR UPDATE OF rating, product_id ON reviews
            FOR EACH ROW
            EXECUTE FUNCTION reviews_aggregate_trigger();
        """)
    )


async def initialize_schema(engine: AsyncEngine) -> None:
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
        await _create_triggers(connection)


async def reset_schema(engine: AsyncEngine) -> None:
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.drop_all)
        await connection.run_sync(Base.metadata.create_all)
        await _create_triggers(connection)


async def _run_schema_command(reset: bool) -> None:
    engine, _ = connect()
    try:
        if reset:
            await reset_schema(engine)
        else:
            await initialize_schema(engine)
    finally:
        await disconnect(engine)


def init_db_cli() -> None:
    asyncio.run(_run_schema_command(reset=False))


def reset_db_cli() -> None:
    asyncio.run(_run_schema_command(reset=True))
