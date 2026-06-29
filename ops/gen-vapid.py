#!/usr/bin/env python3
"""Generate a VAPID keypair for Web Push reminders (ADR-001).

Prints the two env values to paste into `.env`:

  VAPID_PUBLIC_KEY   the browser's applicationServerKey (base64url)
  VAPID_PRIVATE_KEY  the signing key (base64url raw), used by pywebpush

Run from the repo root (needs the API deps installed):

  python ops/gen-vapid.py

Requires `py-vapid` (pulled in by `pywebpush`, see api/requirements.txt).
"""
from __future__ import annotations

import base64
import sys


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def main() -> int:
    try:
        from cryptography.hazmat.primitives import serialization
        from cryptography.hazmat.primitives.asymmetric import ec
    except Exception:  # pragma: no cover
        print("ERROR: cryptography is required (pip install -r api/requirements.txt)", file=sys.stderr)
        return 1

    # VAPID uses an ECDSA P-256 keypair.
    private_key = ec.generate_private_key(ec.SECP256R1())

    # Private key: raw 32-byte scalar, base64url — pywebpush's Vapid.from_string
    # accepts this form directly.
    private_value = private_key.private_numbers().private_value
    private_raw = private_value.to_bytes(32, "big")

    # Public key: the uncompressed point (0x04 || X || Y), base64url — this is the
    # applicationServerKey the browser passes to pushManager.subscribe().
    public_raw = private_key.public_key().public_bytes(
        serialization.Encoding.X962,
        serialization.PublicFormat.UncompressedPoint,
    )

    print("# Add these to your .env (keep the private key secret):")
    print(f"VAPID_PUBLIC_KEY={_b64url(public_raw)}")
    print(f"VAPID_PRIVATE_KEY={_b64url(private_raw)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
