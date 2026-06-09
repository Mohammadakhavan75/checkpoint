import base64
import hashlib
import hmac
import json
import os
import time
from typing import Any


JWT_SECRET = os.getenv("JWT_SECRET", "dev-checkpoint-secret-change-me")


def _b64url_decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


def decode_access_token(token: str) -> dict[str, Any]:
    try:
        header_value, payload_value, signature_value = token.split(".", 2)
        signing_input = f"{header_value}.{payload_value}"
        expected = hmac.new(JWT_SECRET.encode("utf-8"), signing_input.encode("ascii"), hashlib.sha256).digest()
        actual = _b64url_decode(signature_value)
        if not hmac.compare_digest(actual, expected):
            raise ValueError("invalid signature")
        payload = json.loads(_b64url_decode(payload_value))
    except Exception as exc:
        raise ValueError("invalid token") from exc
    if int(payload.get("exp", 0)) < int(time.time()):
        raise ValueError("token expired")
    return payload
