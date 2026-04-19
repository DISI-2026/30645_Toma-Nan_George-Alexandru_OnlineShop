from dataclasses import dataclass
import os
from pathlib import Path


@dataclass(slots=True)
class Settings:
    app_host: str
    app_port: int
    database_url: str
    auth_secret_key: str
    access_token_ttl_minutes: int
    cors_origins: list[str]
    media_root: Path
    max_logo_size_bytes: int
    auto_init_db: bool
    reset_db_on_startup: bool

    @property
    def seller_media_root(self) -> Path:
        return self.media_root / "sellers"


def get_settings() -> Settings:
    backend_root = Path(__file__).resolve().parents[2]
    raw_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000")
    cors_origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
    return Settings(
        app_host=os.getenv("APP_HOST", "0.0.0.0"),
        app_port=int(os.getenv("APP_PORT", "8000")),
        database_url=os.getenv(
            "DATABASE_URL",
            "postgresql+asyncpg://postgres:postgres@db:5432/onlineshop",
        ),
        auth_secret_key=os.getenv(
            "AUTH_SECRET_KEY",
            "change-this-in-production",
        ),
        access_token_ttl_minutes=int(os.getenv("ACCESS_TOKEN_TTL_MINUTES", "60")),
        cors_origins=cors_origins,
        media_root=Path(os.getenv("MEDIA_ROOT", backend_root / "media")),
        max_logo_size_bytes=int(os.getenv("MAX_LOGO_SIZE_BYTES", str(2 * 1024 * 1024))),
        auto_init_db=os.getenv("AUTO_INIT_DB", "false").lower() in {"1", "true", "yes"},
        reset_db_on_startup=os.getenv("RESET_DB_ON_STARTUP", "false").lower() in {"1", "true", "yes"},
    )
