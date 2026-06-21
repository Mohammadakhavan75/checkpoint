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
    # OAuth client secret — required only for the Google Calendar connect flow
    # (server-side authorization-code exchange). Empty disables calendar connect.
    google_client_secret: str = ""
    # Scopes requested when connecting a calendar. openid+email identify the
    # connected account; calendar.readonly is the read-only event mirror.
    google_calendar_scopes: str = (
        "openid email https://www.googleapis.com/auth/calendar.readonly"
    )
    # Fernet key (urlsafe base64, 32 bytes) encrypting stored OAuth tokens at
    # rest. Empty disables calendar connect (we refuse to store a plaintext
    # secret). Generate: python -c "from cryptography.fernet import Fernet;
    # print(Fernet.generate_key().decode())"
    token_encryption_key: str = ""
    # How long a calendar sync stays fresh before a list request triggers a
    # background refresh (stale-while-revalidate, Phase 3).
    calendar_sync_ttl_seconds: int = 300

    # Comma-separated list of allowed CORS origins for the web client.
    cors_origins: str = "https://infiniteai.space,https://www.infiniteai.space,http://localhost:5173,http://127.0.0.1:5173"

    # When true, the API seeds the demo data on startup (idempotent).
    seed_on_start: bool = False

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def calendar_connect_enabled(self) -> bool:
        """Connecting a calendar needs the client id, the secret (for the code
        exchange), and an encryption key (to store tokens at rest)."""
        return bool(
            self.google_client_id
            and self.google_client_secret
            and self.token_encryption_key
        )


settings = Settings()
