from dataclasses import dataclass
import os


@dataclass(slots=True)
class Settings:
    app_host: str
    app_port: int
    database_url: str


def get_settings() -> Settings:
    return Settings(
        app_host=os.getenv("APP_HOST", "0.0.0.0"),
        app_port=int(os.getenv("APP_PORT", "8000")),
        database_url=os.getenv(
            "DATABASE_URL",
            "postgresql+asyncpg://postgres:postgres@db:5432/onlineshop",
        ),
    )
