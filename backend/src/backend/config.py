from dataclasses import dataclass
import os


@dataclass(slots=True)
class Settings:
    app_host: str
    app_port: int
    database_url: str
    auth_secret_key: str
    access_token_ttl_minutes: int


def get_settings() -> Settings:
    return Settings(
        app_host=os.getenv("APP_HOST", "0.0.0.0"),
        app_port=int(os.getenv("APP_PORT", "8000")),
        database_url=os.getenv(
            "DATABASE_URL",
            "postgresql+asyncpg://postgres:postgres@localhost:5432/onlineshop",
        ),
        auth_secret_key=os.getenv(
            "AUTH_SECRET_KEY",
            "change-this-in-production",
        ),
        access_token_ttl_minutes=int(os.getenv("ACCESS_TOKEN_TTL_MINUTES", "60")),
    )
