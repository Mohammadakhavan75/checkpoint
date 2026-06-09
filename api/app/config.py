"""Application configuration via pydantic-settings (env vars)."""
from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Default is SQLite so the app/tests can run with zero infra; docker-compose
    # overrides this with the async Postgres URL.
    database_url: str = "sqlite+aiosqlite:///./checkpoint.db"

    jwt_secret: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days

    # Google OAuth client id (the SPA's id token audience). Empty disables Google sign-in.
    google_client_id: str = ""

    # Comma-separated list of allowed CORS origins for the web client.
    cors_origins: str = "https://infiniteai.space,https://www.infiniteai.space,http://localhost:5173,http://127.0.0.1:5173"

    # When true, the API seeds the demo data on startup (idempotent).
    seed_on_start: bool = False

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
