from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI

from .config import get_settings
from .db import connect, disconnect


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect(app)
    yield
    await disconnect(app)


app = FastAPI(lifespan=lifespan)


@app.get("/health")
async def health() -> dict[str, str]:
    async with app.state.db_pool.acquire() as connection:
        await connection.fetchval("select 1")
    return {"status": "ok"}


def main() -> None:
    settings = get_settings()
    uvicorn.run(app, host=settings.app_host, port=settings.app_port)
