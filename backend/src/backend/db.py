import asyncpg
from fastapi import FastAPI

from .config import get_settings


async def connect(app: FastAPI) -> None:
    settings = get_settings()
    app.state.db_pool = await asyncpg.create_pool(
        dsn=settings.database_url,
        min_size=1,
        max_size=5,
    )


async def disconnect(app: FastAPI) -> None:
    pool = getattr(app.state, "db_pool", None)
    if pool is not None:
        await pool.close()
