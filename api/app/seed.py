"""Seed the dev database with the example data from brain_os.html.

Idempotent: does nothing if the demo user already exists. Run with
``python -m app.seed`` or set ``SEED_ON_START=true``.
"""
from __future__ import annotations

import asyncio

from sqlalchemy import select

from .auth import hash_password
from .db import SessionLocal
from .models import Checkpoint, Domain, Item, User

# Note: must be a publicly-valid domain — EmailStr (email-validator) rejects
# special-use TLDs like .local, so the demo account could not be logged into.
DEMO_EMAIL = "demo@checkpoint.app"
DEMO_PASSWORD = "checkpoint"


async def seed() -> None:
    async with SessionLocal() as session:
        existing = await session.execute(select(User).where(User.email == DEMO_EMAIL))
        if existing.scalar_one_or_none() is not None:
            return

        user = User(email=DEMO_EMAIL, hashed_password=hash_password(DEMO_PASSWORD))
        session.add(user)
        await session.flush()
        uid = user.id

        for domain_name in ("DDWS", "HPC", "Farokhi", "Research", "Teaching", "Personal"):
            session.add(Domain(owner_id=uid, name=domain_name))

        def add(**kwargs) -> Item:
            item = Item(owner_id=uid, **kwargs)
            session.add(item)
            return item

        def mk(title: str, domain: str, state: str) -> Item:
            return add(title=title, domain=domain, state=state, fields={})

        # ---- reservoir (brain rots) ----
        for title in (
            "Game Theory",
            "Reinforcement Learning",
            "Quantum Physics",
            "Trader AI",
            "Credit automation",
            "New website",
        ):
            add(title=title, domain="reservoir", state="idea", fields={})

        # ---- DDWS ----
        mk("Benchmark LLM distribution", "DDWS", "idea")
        add(
            title="Deploy checkpoint app",
            domain="DDWS",
            state="active",
            compiled=True,
            mode="Do",
            procedure="known",
            scope="bounded",
            fields={
                "description": "Ship the training-checkpoint browser app to the DDWS staging host.",
                "firstAction": "pull latest build, run the deploy script against staging",
                "risk": "staging env vars may differ from local",
                "resumeFrom": "staging deploy step",
            },
        )
        mk("Prepare LLM documentation", "DDWS", "needsdef")
        mk("Add LLM deployment service", "DDWS", "idea")
        mk("Study LLM Security", "DDWS", "needsdef")

        # ---- HPC ----
        mk("Redis problem alerting", "HPC", "idea")
        mk("Review backup system", "HPC", "needsdef")
        mk("HAProxy client IP forwarding", "HPC", "idea")
        mk("Resolve nano cluster", "HPC", "blocked")

        # ---- Research ----
        mk("Paper Search", "Research", "scout")

        # ---- a fully-compiled, daily, already-checkpointed example ----
        vllm = add(
            title="Build vLLM image",
            domain="DDWS",
            state="deferred",
            daily=True,
            compiled=True,
            mode="Do",
            procedure="known",
            scope="bounded",
            fields={
                "description": "Containerized vLLM serving image (CUDA + Torch + Transformers + vLLM), tested locally before push.",
                "whyNow": "serving stack blocks the benchmark work",
                "output": "working local Docker image (CUDA+Torch+Transformers+vLLM)",
                "firstAction": "docker build from CUDA base image",
                "minWin": "image builds and `vllm --version` runs inside it",
                "stopRule": "stop once test command passes, or first hard error",
                "checkpointRule": "record Dockerfile, build cmd, test cmd, any errors",
                "resumeFrom": "docker push step",
                "risk": "registry certificate may fail during push",
            },
        )
        await session.flush()
        session.add(
            Checkpoint(
                item_id=vllm.id,
                outcome="deferred",
                last_state="image works locally, not pushed yet",
                what_changed="CUDA + Torch + Transformers + vLLM stack installed",
                problems="registry certificate may fail during push",
                next_action="push to registry, test remote pull",
                resume_from="docker push step",
                do_not_redo="base image + python deps already installed",
            )
        )

        add(
            title="Scout LLM Security",
            domain="DDWS",
            state="scout",
            daily=True,
            compiled=True,
            mode="Scout",
            procedure="unknown",
            scope="bounded",
            fields={
                "description": "Map the LLM attack surface relevant to DDWS before any public-facing deployment.",
                "whyNow": "DDWS needs secure LLM deployment before public usage",
                "output": "security-map.md",
                "firstAction": "list 5 LLM attack categories + one concrete example each",
                "minWin": "pick the top 2 DDWS-relevant risks",
                "stopRule": "stop after 45 min even if the field is incomplete",
                "checkpointRule": "write sources, learned concepts, next action",
                "resumeFrom": "security-map.md",
                "risk": "topic can expand infinitely",
            },
        )

        # ---- a Time-trap container with phase children ----
        slurm = add(
            title="Setup Ubuntu/Slurm cluster",
            domain="HPC",
            state="active",
            compiled=True,
            mode="Plan",
            procedure="known",
            scope="unbounded",
            fields={
                "description": "Stand up a Slurm-scheduled Ubuntu cluster for HPC jobs — known steps, but unbounded in practice.",
                "risk": "per-node hardware quirks",
            },
        )
        await session.flush()
        for title, first_action, state in (
            ("Phase 1: inventory nodes + network", "ssh each node, record specs + IPs", "done"),
            ("Phase 2: base Ubuntu + admin user", "install Ubuntu LTS, create admin user", "active"),
            ("Phase 3: install Slurm controller", "apt install slurm-wlm on the head node", "active"),
            ("Phase 4: register compute nodes", "write the node entries in slurm.conf", "needsdef"),
        ):
            add(
                title=title,
                domain="HPC",
                state=state,
                parent_id=slurm.id,
                compiled=bool(first_action),
                mode="Do",
                procedure="known",
                scope="bounded",
                fields={"description": title, "firstAction": first_action, "risk": ""},
            )

        await session.commit()


if __name__ == "__main__":
    asyncio.run(seed())
