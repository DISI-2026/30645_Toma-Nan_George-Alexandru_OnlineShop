from collections.abc import AsyncIterator

from fastapi import Request
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from models import Base

from .config import get_settings


def connect() -> tuple[AsyncEngine, async_sessionmaker[AsyncSession]]:
    settings = get_settings()
    engine = create_async_engine(
        settings.database_url,
        pool_size=5,
        max_overflow=0,
        pool_pre_ping=True,
    )
    session_factory = async_sessionmaker(
        bind=engine,
        expire_on_commit=False,
        autoflush=False,
        autocommit=False,
    )
    return engine, session_factory


async def ensure_schema(engine: AsyncEngine) -> None:
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
        if connection.dialect.name == "postgresql":
            from sqlalchemy import text

            await connection.execute(
                text("ALTER TABLE IF EXISTS reviews ADD COLUMN IF NOT EXISTS seller_reply TEXT;")
            )
            await connection.execute(
                text(
                    "ALTER TABLE IF EXISTS reviews "
                    "ADD COLUMN IF NOT EXISTS reply_date TIMESTAMP WITH TIME ZONE;"
                )
            )


async def disconnect(engine: AsyncEngine | None) -> None:
    if isinstance(engine, AsyncEngine):
        await engine.dispose()


async def get_db_session(request: Request) -> AsyncIterator[AsyncSession]:
    session_factory: async_sessionmaker[AsyncSession] = request.app.state.db_sessionmaker
    async with session_factory() as session:
        yield session
