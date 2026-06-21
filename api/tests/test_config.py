"""Security invariants for environment-dependent application settings."""

import pytest
from pydantic import ValidationError

from app.config import Settings


def test_production_rejects_weak_jwt_secret():
    with pytest.raises(ValidationError, match="at least 32 characters"):
        Settings(
            _env_file=None,
            app_env="production",
            database_url="postgresql+asyncpg://checkpoint:password@db/checkpoint",
            jwt_secret="dev-secret-change-me",
        )


def test_production_rejects_demo_seed():
    with pytest.raises(ValidationError, match="must be false"):
        Settings(
            _env_file=None,
            app_env="production",
            database_url="postgresql+asyncpg://checkpoint:password@db/checkpoint",
            jwt_secret="a" * 32,
            seed_on_start=True,
        )


def test_production_accepts_explicit_secure_settings():
    production = Settings(
        _env_file=None,
        app_env="production",
        database_url="postgresql+asyncpg://checkpoint:password@db/checkpoint",
        jwt_secret="a" * 32,
        seed_on_start=False,
    )

    assert production.app_env == "production"
