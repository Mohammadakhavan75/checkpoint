"""Application configuration via pydantic-settings (env vars)."""
from __future__ import annotations

from typing import Literal

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: Literal["development", "test", "production"] = "development"

    # Default is SQLite so the app/tests can run with zero infra; docker-compose
    # overrides this with the async Postgres URL.
    database_url: str = "sqlite+aiosqlite:///./checkpoint.db"

    jwt_secret: str = "development-only-secret-change-me-now"
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

    # --- Web Push reminders (ADR-001) ----------------------------------------
    # VAPID keypair identifying this server to browser push services. The public
    # key is the browser's applicationServerKey (base64url); the private key
    # signs each push (PEM or base64url raw, both accepted by pywebpush). Empty
    # disables reminders (we won't half-enable a push channel). Generate with
    # ops/gen-vapid.py.
    vapid_public_key: str = ""
    vapid_private_key: str = ""
    # The "sub" claim in the VAPID JWT — a mailto: or https: the push service can
    # contact about this application server.
    vapid_subject: str = "mailto:admin@checkpoint.local"
    # How often the in-process scheduler wakes to fire due reminders / the nudge.
    reminder_tick_seconds: int = 60
    # On boot, fire reminders overdue by up to this many minutes (catch-up after a
    # deploy/restart). Older-than-grace reminders are marked sent without firing —
    # a stale "do this now" is noise, not a gift.
    reminder_catchup_grace_minutes: int = 120

    # Comma-separated list of allowed CORS origins for the web client.
    cors_origins: str = "https://infiniteai.space,https://www.infiniteai.space,http://localhost:5173,http://127.0.0.1:5173"

    # When true, the API seeds the demo data on startup (idempotent).
    seed_on_start: bool = False

    @model_validator(mode="after")
    def validate_production_security(self) -> "Settings":
        if self.app_env != "production":
            return self
        if self.database_url.startswith("sqlite"):
            raise ValueError("production requires an external database")
        if (
            self.jwt_secret == "development-only-secret-change-me-now"
            or len(self.jwt_secret) < 32
        ):
            raise ValueError("production JWT_SECRET must be at least 32 characters")
        if self.seed_on_start:
            raise ValueError("SEED_ON_START must be false in production")
        return self

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

    @property
    def reminders_available(self) -> bool:
        """Web Push reminders need a VAPID keypair (to sign pushes) and an
        encryption key (subscription endpoints are stored encrypted at rest, like
        calendar tokens). Without all three the whole subsystem stays dark."""
        return bool(
            self.vapid_public_key
            and self.vapid_private_key
            and self.token_encryption_key
        )

    @property
    def two_factor_available(self) -> bool:
        """TOTP enrollment stores the shared secret encrypted at rest, so the
        feature is offered only when an encryption key is configured (same key
        as the calendar tokens). Without it we refuse to store the secret."""
        return bool(self.token_encryption_key)


settings = Settings()
