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
        text("""
            DROP TRIGGER IF EXISTS products_updated_at ON products;
            CREATE TRIGGER products_updated_at
            BEFORE UPDATE ON products
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at();
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
