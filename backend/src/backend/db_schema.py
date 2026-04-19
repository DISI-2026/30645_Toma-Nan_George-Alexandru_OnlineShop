from __future__ import annotations

import asyncio

from sqlalchemy.ext.asyncio import AsyncEngine

from models import Base
import models  # noqa: F401

from .db import connect, disconnect


async def initialize_schema(engine: AsyncEngine) -> None:
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)


async def reset_schema(engine: AsyncEngine) -> None:
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.drop_all)
        await connection.run_sync(Base.metadata.create_all)


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
