from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from sqlalchemy import text

from api.router import api_router
from .config import get_settings
from .db import connect, disconnect, ensure_schema


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.settings = get_settings()
    engine, session_factory = connect()
    await ensure_schema(engine)
    app.state.db_engine = engine
    app.state.db_sessionmaker = session_factory
    yield
    await disconnect(engine)


app = FastAPI(lifespan=lifespan)
app.include_router(api_router)


@app.get("/health")
async def health() -> dict[str, str]:
    async with app.state.db_engine.connect() as connection:
        await connection.execute(text("SELECT 1"))
    return {"status": "ok"}


def main() -> None:
    settings = get_settings()
    uvicorn.run(app, host=settings.app_host, port=settings.app_port)
