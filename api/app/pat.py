"""Mint / list / revoke personal access tokens for the agent API.

Run from api/ with the virtualenv active (needs DATABASE_URL, like alembic):

  python -m app.pat create --email you@example.com --name claude-code [--expires-days 90]
  python -m app.pat list   --email you@example.com
  python -m app.pat revoke --email you@example.com --prefix ckpt_pat_XXXX

The raw token prints exactly once. Store it in your shell env (CHECKPOINT_PAT),
never in git. See docs/product/OBJECT_PERMANENCE_MCP.md.
"""
from __future__ import annotations

import argparse
import asyncio
import sys

from sqlalchemy import select

from .db import SessionLocal
from .models import User
from .services.pats import create_pat, list_pats, revoke_pat


async def _get_user(session, email: str) -> User:
    result = await session.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user is None:
        print(f"no user with email {email!r}", file=sys.stderr)
        raise SystemExit(1)
    return user


async def _create(email: str, name: str, expires_days: int | None) -> None:
    async with SessionLocal() as session:
        user = await _get_user(session, email)
        raw, pat = await create_pat(session, user.id, name, expires_days)
        await session.commit()
        print("Personal access token (shown once, store it now):\n")
        print(f"  {raw}\n")
        print(f"name: {pat.name}  expires: {pat.expires_at or 'never'}")


async def _list(email: str) -> None:
    async with SessionLocal() as session:
        user = await _get_user(session, email)
        rows = await list_pats(session, user.id)
        if not rows:
            print("no tokens")
            return
        for p in rows:
            status = "revoked" if p.revoked_at else "live"
            expiry = f"{p.expires_at:%Y-%m-%d}" if p.expires_at else "never"
            print(
                f"{p.token_prefix}…  {p.name:<24} {status:<8} "
                f"created={p.created_at:%Y-%m-%d} expires={expiry}"
            )


async def _revoke(email: str, prefix: str) -> None:
    async with SessionLocal() as session:
        user = await _get_user(session, email)
        n = await revoke_pat(session, user.id, prefix)
        await session.commit()
        print(f"revoked {n} token(s)")


def main() -> None:
    parser = argparse.ArgumentParser(prog="python -m app.pat")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_create = sub.add_parser("create")
    p_create.add_argument("--email", required=True)
    p_create.add_argument("--name", required=True)
    p_create.add_argument("--expires-days", type=int, default=90)

    p_list = sub.add_parser("list")
    p_list.add_argument("--email", required=True)

    p_revoke = sub.add_parser("revoke")
    p_revoke.add_argument("--email", required=True)
    p_revoke.add_argument("--prefix", required=True)

    args = parser.parse_args()
    if args.cmd == "create":
        asyncio.run(_create(args.email, args.name, args.expires_days or None))
    elif args.cmd == "list":
        asyncio.run(_list(args.email))
    elif args.cmd == "revoke":
        asyncio.run(_revoke(args.email, args.prefix))


if __name__ == "__main__":
    main()
