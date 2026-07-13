"""Checkpoint MCP server (stdio) — the agent-side of the checkpoint ledger.

Bridges MCP tool calls to the Checkpoint agent API (/api/agent/*) using a
personal access token. Config via env (see .mcp.json.example at repo root):

  CHECKPOINT_API_BASE  e.g. http://localhost:8000/api   (default)
  CHECKPOINT_PAT       ckpt_pat_…  (mint: cd api && python -m app.pat create …)

Spec: docs/product/OBJECT_PERMANENCE_MCP.md
"""
from __future__ import annotations

import os
from typing import Any

import httpx
from mcp.server.fastmcp import FastMCP

API_BASE = os.environ.get(
    "CHECKPOINT_API_BASE", "http://localhost:8000/api"
).rstrip("/")
PAT = os.environ.get("CHECKPOINT_PAT", "")

mcp = FastMCP("checkpoint")


async def _call(method: str, path: str, **kwargs: Any) -> dict | list:
    """One HTTP round-trip. Errors come back as {'error': …} strings so the
    model can read and react to them instead of crashing the tool call."""
    if not PAT:
        return {
            "error": "CHECKPOINT_PAT is not set. Mint one: "
            "cd api && python -m app.pat create --email <you> --name <label>"
        }
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.request(
                method,
                f"{API_BASE}{path}",
                headers={"Authorization": f"Bearer {PAT}"},
                **kwargs,
            )
    except httpx.HTTPError as exc:
        return {"error": f"cannot reach the Checkpoint API at {API_BASE}: {exc}"}
    if response.status_code >= 400:
        try:
            detail = response.json().get("detail", response.text[:300])
        except Exception:
            detail = response.text[:300]
        return {"error": f"HTTP {response.status_code}: {detail}"}
    return response.json()


@mcp.tool()
async def orient(domain: str | None = None, limit: int = 10) -> dict | list:
    """Re-orient at the start of a work session: the user's open work threads,
    freshest first, each with its latest checkpoint receipt (where it stopped,
    what to do next). Call this BEFORE asking the user what they were doing —
    the answer is usually in here. Optionally filter to one domain.
    Also returns the working protocol; follow it."""
    params: dict[str, Any] = {"limit": limit}
    if domain:
        params["domain"] = domain
    return await _call("GET", "/agent/orient", params=params)


@mcp.tool()
async def get_item(item_id: str) -> dict | list:
    """Full detail for one work item by id (from orient): its phases and their
    states, the last 5 checkpoint receipts, and any snapshot notes. A container's
    phases are the work plan — execute them one at a time, in order."""
    return await _call("GET", f"/agent/items/{item_id}")


@mcp.tool()
async def save_checkpoint(
    item_id: str,
    outcome: str,
    last_state: str,
    resume_from: str = "",
    next_action: str = "",
    what_changed: str = "",
    problems: str = "",
    do_not_redo: str = "",
) -> dict | list:
    """Write the receipt that lets the NEXT session (human or agent) resume
    without re-deriving context. Call it (a) immediately after finishing each
    phase — outcome='done' — never batching several phases into one receipt,
    and (b) whenever work stops before it is finished — outcome='active' (will
    continue), 'blocked' (needs something), or 'deferred' (parked).

    item_id: the exact item/phase worked on (checkpoint the PHASE, not its
    container — the container rolls up automatically).
    outcome: one of active|deferred|blocked|done. Sets the item's state.
    last_state: one line — where things stand right now.
    resume_from: REQUIRED unless outcome='done'. Concrete re-entry point:
    file paths, function names, commands, ids. Never vague prose like
    "continue the feature".
    next_action: the single first move for the next session.
    what_changed / problems / do_not_redo: optional but valuable — decisions
    made, surprises hit, work that must not be repeated."""
    body: dict[str, Any] = {"outcome": outcome, "last_state": last_state}
    for key, value in (
        ("resume_from", resume_from),
        ("next_action", next_action),
        ("what_changed", what_changed),
        ("problems", problems),
        ("do_not_redo", do_not_redo),
    ):
        if value:
            body[key] = value
    return await _call("POST", f"/agent/items/{item_id}/checkpoints", json=body)


@mcp.tool()
async def capture(text: str, domain: str | None = None) -> dict | list:
    """Park a stray idea/task the user mentions mid-session so it isn't lost
    (max 500 chars). Without a domain it lands in the reservoir (parked ideas);
    with an existing domain name it lands there as an undefined task. Never
    invent domain names — omit the domain when unsure. Do NOT use this for
    work already being tracked; checkpoint that instead."""
    body: dict[str, Any] = {"text": text}
    if domain:
        body["domain"] = domain
    return await _call("POST", "/agent/capture", json=body)


if __name__ == "__main__":
    mcp.run()
