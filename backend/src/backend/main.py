from contextlib import asynccontextmanager

from backend.neo4j import Neo4jConnection
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from api.router import api_router
from .api.errors import (
    APIError,
    api_error_handler,
    http_exception_handler,
    validation_error_handler,
)
from .config import get_settings
from .db import connect, disconnect, ensure_schema
from .db_schema import initialize_schema, reset_schema


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    settings.media_root.mkdir(parents=True, exist_ok=True)
    settings.seller_media_root.mkdir(parents=True, exist_ok=True)
    engine, session_factory = connect()
    await ensure_schema(engine)
    app.state.db_engine = engine
    app.state.db_sessionmaker = session_factory
    app.state.settings = settings

    app.state.neo4j = Neo4jConnection(
        settings.neo4j_uri, settings.neo4j_username, settings.neo4j_password
    )
    await app.state.neo4j.connect()

    if settings.reset_db_on_startup:
        await reset_schema(engine)
    elif settings.auto_init_db:
        await initialize_schema(engine)
    yield
    await app.state.neo4j.close()
    await disconnect(engine)


def create_app() -> FastAPI:
    settings = get_settings()
    settings.media_root.mkdir(parents=True, exist_ok=True)
    settings.seller_media_root.mkdir(parents=True, exist_ok=True)
    app = FastAPI(lifespan=lifespan)
    app.state.settings = settings
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.mount("/media", StaticFiles(directory=settings.media_root), name="media")
    app.add_exception_handler(APIError, api_error_handler)
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_error_handler)
    app.include_router(api_router, prefix="/api/v1")
    return app


app = create_app()


@app.get("/health")
async def health() -> dict[str, str]:
    async with app.state.db_engine.connect() as connection:
        await connection.execute(text("SELECT 1"))
    return {"status": "ok"}


def main() -> None:
    settings = get_settings()
    uvicorn.run(app, host=settings.app_host, port=settings.app_port)
