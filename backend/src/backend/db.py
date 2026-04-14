from fastapi import FastAPI
from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker, create_async_engine

from .config import get_settings


def connect(app: FastAPI) -> None:
    settings = get_settings()
    engine = create_async_engine(
        settings.database_url,
        pool_size=5,
        max_overflow=0,
        pool_pre_ping=True,
    )
    app.state.db_engine = engine
    app.state.db_sessionmaker = async_sessionmaker(
        bind=engine,
        expire_on_commit=False,
        autoflush=False,
        autocommit=False,
    )


async def disconnect(app: FastAPI) -> None:
    engine = getattr(app.state, "db_engine", None)
    if isinstance(engine, AsyncEngine):
        await engine.dispose()
