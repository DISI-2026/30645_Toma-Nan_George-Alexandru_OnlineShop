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
    frontend_base_url: str
    password_reset_token_ttl_minutes: int
    smtp_host: str
    smtp_port: int
    smtp_from_email: str
    cors_origins: list[str]
    media_root: Path
    max_logo_size_bytes: int
    auto_init_db: bool
    reset_db_on_startup: bool

    # Neo4j settings
    neo4j_uri: str = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    neo4j_username: str = os.getenv("NEO4J_USERNAME", "neo4j")
    neo4j_password: str = os.getenv("NEO4J_PASSWORD", "neo4jpwd")

    @property
    def seller_media_root(self) -> Path:
        return self.media_root / "sellers"


def get_settings() -> Settings:
    backend_root = Path(__file__).resolve().parents[2]
    raw_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000")
    cors_origins = [
        origin.strip() for origin in raw_origins.split(",") if origin.strip()
    ]
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
        frontend_base_url=os.getenv("FRONTEND_BASE_URL", "http://localhost:3000"),
        password_reset_token_ttl_minutes=int(
            os.getenv("PASSWORD_RESET_TOKEN_TTL_MINUTES", "30")
        ),
        smtp_host=os.getenv("SMTP_HOST", "localhost"),
        smtp_port=int(os.getenv("SMTP_PORT", "1025")),
        smtp_from_email=os.getenv("SMTP_FROM_EMAIL", "no-reply@onlineshop.ro"),
        cors_origins=cors_origins,
        media_root=Path(os.getenv("MEDIA_ROOT", backend_root / "media")),
        max_logo_size_bytes=int(os.getenv("MAX_LOGO_SIZE_BYTES", str(2 * 1024 * 1024))),
        auto_init_db=os.getenv("AUTO_INIT_DB", "false").lower() in {"1", "true", "yes"},
        reset_db_on_startup=os.getenv("RESET_DB_ON_STARTUP", "false").lower()
        in {"1", "true", "yes"},
    )
