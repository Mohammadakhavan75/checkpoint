"""Symmetric encryption for OAuth tokens at rest (Fernet / AES-128-CBC + HMAC).

A refresh token is a long-lived secret, so it is never stored in plaintext. The
key comes from ``settings.token_encryption_key`` and is deliberately *not* the
JWT secret — different blast radius. ``cryptography`` is imported lazily so the
rest of the app (and tests that don't touch calendars) need not load it.
"""
from __future__ import annotations

from functools import lru_cache

from ..config import settings


class TokenEncryptionUnavailable(RuntimeError):
    """Raised when no encryption key is configured — we refuse to store secrets
    in the clear, so calendar connect is disabled rather than insecure."""


@lru_cache(maxsize=1)
def _fernet():
    if not settings.token_encryption_key:
        raise TokenEncryptionUnavailable("TOKEN_ENCRYPTION_KEY is not configured")
    from cryptography.fernet import Fernet

    return Fernet(settings.token_encryption_key.encode())


def encrypt(plaintext: str) -> str:
    return _fernet().encrypt(plaintext.encode()).decode()


def decrypt(ciphertext: str) -> str:
    return _fernet().decrypt(ciphertext.encode()).decode()
