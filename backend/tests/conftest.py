from __future__ import annotations

import os
from collections.abc import AsyncIterator
from pathlib import Path

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from backend.db import get_db_session
from backend.main import create_app
from models import Base


@pytest_asyncio.fixture
async def app(tmp_path: Path):
    media_root = tmp_path / "media"
    os.environ["MEDIA_ROOT"] = str(media_root)
    os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{tmp_path / 'seller-tests.db'}"
    os.environ["AUTH_SECRET_KEY"] = "test-secret"
    os.environ["ACCESS_TOKEN_TTL_MINUTES"] = "60"

    application = create_app()
    engine = create_async_engine(os.environ["DATABASE_URL"], future=True)
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    factory = async_sessionmaker(engine, expire_on_commit=False)
    application.state.db_sessionmaker = factory
    application.state.db_engine = engine
    application.state.settings.media_root.mkdir(parents=True, exist_ok=True)
    application.state.settings.seller_media_root.mkdir(parents=True, exist_ok=True)

    async def override_get_db_session() -> AsyncIterator[AsyncSession]:
        async with factory() as session:
            yield session

    application.dependency_overrides[get_db_session] = override_get_db_session
    yield application
    application.dependency_overrides.clear()
    await engine.dispose()


@pytest_asyncio.fixture
async def session_factory(app) -> async_sessionmaker[AsyncSession]:
    return app.state.db_sessionmaker


@pytest_asyncio.fixture
async def client(app) -> AsyncIterator[AsyncClient]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as http_client:
        yield http_client
