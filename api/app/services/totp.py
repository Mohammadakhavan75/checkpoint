"""TOTP (RFC 6238) — the math behind a Google Authenticator code.

Implemented on the standard library (``hmac``/``hashlib``/``struct``/``secrets``)
rather than a third-party OTP package, mirroring how the app hashes passwords
with ``bcrypt`` directly: a small, auditable, dependency-light primitive for a
security-sensitive path. Google Authenticator's defaults — SHA1, 6 digits, a
30-second step — are the only mode we support.

The secret itself is a long-lived credential; it is never stored in plaintext
(see ``services/crypto.py`` for the Fernet wrapper that encrypts it at rest).
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
import struct
import time
from urllib.parse import quote, urlencode

DIGITS = 6
PERIOD = 30  # seconds per step
# How many adjacent steps on each side we accept, to tolerate clock skew between
# the user's phone and the server (±1 step = ±30s).
SKEW_STEPS = 1
ISSUER = "Checkpoint"


def generate_secret() -> str:
    """A fresh base32 secret (no padding) — what the authenticator app stores."""
    return base64.b32encode(secrets.token_bytes(20)).decode("ascii").rstrip("=")


def _code_at(secret: str, counter: int) -> str:
    # base32 decoding needs the padding back and an upper-cased alphabet.
    padded = secret.upper() + "=" * (-len(secret) % 8)
    key = base64.b32decode(padded)
    digest = hmac.new(key, struct.pack(">Q", counter), hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    truncated = struct.unpack(">I", digest[offset : offset + 4])[0] & 0x7FFFFFFF
    return str(truncated % (10**DIGITS)).zfill(DIGITS)


def verify(secret: str, code: str, *, at: float | None = None) -> bool:
    """True if ``code`` is valid for ``secret`` now (within the skew window).

    The comparison is constant-time, and we reject anything that isn't exactly
    ``DIGITS`` digits before doing any HMAC work.
    """
    code = (code or "").strip().replace(" ", "")
    if len(code) != DIGITS or not code.isdigit():
        return False
    now = time.time() if at is None else at
    counter = int(now // PERIOD)
    for step in range(-SKEW_STEPS, SKEW_STEPS + 1):
        if hmac.compare_digest(_code_at(secret, counter + step), code):
            return True
    return False


def provisioning_uri(secret: str, account: str, issuer: str = ISSUER) -> str:
    """The ``otpauth://`` URI encoded into the enrollment QR code."""
    # Quote issuer and account separately, keeping the ":" literal as the
    # label separator (the otpauth convention authenticator apps expect).
    label = f"{quote(issuer)}:{quote(account)}"
    params = urlencode(
        {
            "secret": secret,
            "issuer": issuer,
            "algorithm": "SHA1",
            "digits": DIGITS,
            "period": PERIOD,
        }
    )
    return f"otpauth://totp/{label}?{params}"


def qr_data_uri(uri: str) -> str:
    """An SVG ``data:`` URI for ``uri``, ready to drop into an <img src>.

    Rendered with ``segno`` (pure-Python, zero-dependency) so no QR library is
    pulled into the web bundle and the secret-bearing image is built server-side.
    """
    import segno

    return segno.make(uri, error="m").svg_data_uri(scale=5, border=2)
