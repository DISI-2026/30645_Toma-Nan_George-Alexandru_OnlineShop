from collections.abc import AsyncGenerator

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker


async def get_db_session(request: Request) -> AsyncGenerator[AsyncSession]:
    session_factory = getattr(request.app.state, "db_sessionmaker", None)
    if not isinstance(session_factory, async_sessionmaker):
        raise RuntimeError("Database session factory is not configured.")

    async with session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise

