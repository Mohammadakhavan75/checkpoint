"""Unit tests for the ported domain logic: rollup, set_state, compile, checkpoints."""
from __future__ import annotations

from app.models import Item, User
from app.schemas import CheckpointCreate, CompileRequest, PhaseInput
from app.services.checkpoints import save_checkpoint
from app.services.items import (
    capture,
    compile_item,
    get_children,
    promote,
    rollup,
    set_state,
)


async def _add(session, user, **kwargs) -> Item:
    item = Item(owner_id=user.id, fields=kwargs.pop("fields", {}), **kwargs)
    session.add(item)
    await session.flush()
    return item


async def test_capture_and_promote(session, user):
    item = await capture(session, user.id, "  new idea  ")
    assert item.title == "new idea"
    assert item.domain == "reservoir"
    assert item.state == "idea"

    await promote(session, item, "DDWS")
    assert item.domain == "DDWS"
    assert item.state == "needsdef"


async def test_capture_direct_into_domain(session, user):
    """Fast Task Domain: capturing with a domain skips the reservoir."""
    item = await capture(session, user.id, "  ship it  ", "DDWS")
    assert item.title == "ship it"
    assert item.domain == "DDWS"
    assert item.state == "needsdef"

    # An explicit reservoir target still parks the idea.
    parked = await capture(session, user.id, "later", "reservoir")
    assert parked.domain == "reservoir"
    assert parked.state == "idea"


async def test_rollup_all_done(session, user):
    parent = await _add(session, user, title="P", domain="HPC", state="active")
    await _add(session, user, title="c1", domain="HPC", state="done", parent_id=parent.id)
    await _add(session, user, title="c2", domain="HPC", state="done", parent_id=parent.id)
    await rollup(session, parent.id, user.id)
    assert parent.state == "done"


async def test_rollup_all_resolved_is_deferred(session, user):
    parent = await _add(session, user, title="P", domain="HPC", state="active")
    await _add(session, user, title="c1", domain="HPC", state="done", parent_id=parent.id)
    await _add(session, user, title="c2", domain="HPC", state="killed", parent_id=parent.id)
    await rollup(session, parent.id, user.id)
    assert parent.state == "deferred"


async def test_rollup_active_when_any_child_active(session, user):
    parent = await _add(session, user, title="P", domain="HPC", state="needsdef")
    await _add(session, user, title="c1", domain="HPC", state="active", parent_id=parent.id)
    await _add(session, user, title="c2", domain="HPC", state="needsdef", parent_id=parent.id)
    await rollup(session, parent.id, user.id)
    assert parent.state == "active"


async def test_set_state_container_cascades(session, user):
    parent = await _add(session, user, title="P", domain="HPC", state="active")
    await _add(session, user, title="c1", domain="HPC", state="active", parent_id=parent.id)
    await _add(session, user, title="c2", domain="HPC", state="needsdef", parent_id=parent.id)
    await set_state(session, parent, "killed")
    children = await get_children(session, parent.id, user.id)
    assert all(c.state == "killed" for c in children)


async def test_set_state_child_rolls_up_parent(session, user):
    parent = await _add(session, user, title="P", domain="HPC", state="needsdef")
    await _add(session, user, title="c1", domain="HPC", state="done", parent_id=parent.id)
    c2 = await _add(session, user, title="c2", domain="HPC", state="active", parent_id=parent.id)
    await set_state(session, c2, "done")
    assert parent.state == "done"


async def test_compile_simple_unit(session, user):
    item = await _add(session, user, title="task", domain="DDWS", state="idea")
    await compile_item(
        session,
        item,
        CompileRequest(procedure="known", scope="bounded", description="d", firstAction="do x"),
        user.id,
    )
    assert item.compiled is True
    assert item.mode == "Do"
    assert item.state == "active"
    assert item.fields["firstAction"] == "do x"


async def test_compile_scout_sets_scout_state(session, user):
    item = await _add(session, user, title="task", domain="DDWS", state="needsdef")
    await compile_item(
        session,
        item,
        CompileRequest(procedure="unknown", scope="bounded", description="map", firstAction="list"),
        user.id,
    )
    assert item.mode == "Scout"
    assert item.state == "scout"


async def test_compile_time_trap_becomes_container(session, user):
    item = await _add(session, user, title="cluster", domain="HPC", state="needsdef")
    payload = CompileRequest(
        procedure="known",
        scope="unbounded",
        description="big",
        phases=[
            PhaseInput(title="Phase 1", firstAction="do 1"),
            PhaseInput(title="Phase 2", firstAction=""),
        ],
    )
    await compile_item(session, item, payload, user.id)

    assert item.compiled is True
    assert item.daily is False
    assert item.fields.get("firstAction") == ""

    children = await get_children(session, item.id, user.id)
    by_title = {c.title: c for c in children}
    assert len(children) == 2
    assert by_title["Phase 1"].state == "active"
    assert by_title["Phase 1"].compiled is True
    assert by_title["Phase 2"].state == "needsdef"
    assert by_title["Phase 2"].compiled is False


async def test_compile_reconcile_keeps_and_drops(session, user):
    item = await _add(session, user, title="cluster", domain="HPC", state="needsdef")
    await compile_item(
        session,
        item,
        CompileRequest(
            procedure="known",
            scope="unbounded",
            phases=[PhaseInput(title="A", firstAction="a"), PhaseInput(title="B", firstAction="b")],
        ),
        user.id,
    )
    children = await get_children(session, item.id, user.id)
    phase_a = next(c for c in children if c.title == "A")

    # recompile: rename A, drop B
    await compile_item(
        session,
        item,
        CompileRequest(
            procedure="known",
            scope="unbounded",
            phases=[PhaseInput(id=phase_a.id, title="A2", firstAction="a2")],
        ),
        user.id,
    )
    children = await get_children(session, item.id, user.id)
    assert len(children) == 1
    assert children[0].id == phase_a.id
    assert children[0].title == "A2"


async def test_save_checkpoint_sets_state_and_clears_daily(session, user):
    item = await _add(session, user, title="t", domain="DDWS", state="active", daily=True)
    cp = await save_checkpoint(
        session,
        item,
        CheckpointCreate(outcome="done", last_state="ls", next_action="na", resume_from="rf"),
        user.id,
    )
    assert item.state == "done"
    assert item.daily is False
    assert cp.outcome == "done"


async def test_container_cascade_ignores_cross_owner_children(session, user):
    other = User(email="other@example.com", hashed_password="not-used")
    session.add(other)
    await session.flush()
    parent = Item(owner_id=other.id, title="victim", domain="HPC", state="active", fields={})
    session.add(parent)
    await session.flush()
    legitimate = Item(
        owner_id=other.id,
        parent_id=parent.id,
        title="legitimate",
        domain="HPC",
        state="active",
        fields={},
    )
    foreign = Item(
        owner_id=user.id,
        parent_id=parent.id,
        title="foreign",
        domain="HPC",
        state="active",
        fields={},
    )
    session.add_all([legitimate, foreign])
    await session.flush()

    children = await get_children(session, parent.id, other.id)
    assert [child.id for child in children] == [legitimate.id]

    await set_state(session, parent, "killed")
    assert legitimate.state == "killed"
    assert foreign.state == "active"


async def test_delete_account_removes_all_owned_data_and_isolates_others(
    session, user, monkeypatch
):
    """delete_account erases the user's items, checkpoints, snapshots, domains and
    calendar connection — and nothing belonging to another account."""
    from cryptography.fernet import Fernet
    from sqlalchemy import select

    from app.config import settings
    from app.models import CalendarConnection, Checkpoint, Domain, Snapshot, User
    from app.services import account
    from app.services.account import delete_account
    from app.services.crypto import _fernet, encrypt

    settings.token_encryption_key = Fernet.generate_key().decode()
    _fernet.cache_clear()
    revoked: list[str] = []
    monkeypatch.setattr(account, "revoke_token", lambda token: revoked.append(token))

    # The account under deletion: a domain, a parent item + child, history on both.
    parent = await _add(session, user, title="P", domain="HPC", state="active")
    child = await _add(
        session, user, title="c1", domain="HPC", state="active", parent_id=parent.id
    )
    session.add(Domain(owner_id=user.id, name="HPC"))
    session.add(
        Checkpoint(
            item_id=parent.id,
            outcome="active",
            last_state="active",
            next_action="go",
            resume_from="here",
        )
    )
    session.add(Snapshot(item_id=child.id, note="scratch"))
    session.add(
        CalendarConnection(
            owner_id=user.id, refresh_token_enc=encrypt("rt"), status="active"
        )
    )

    # A bystander whose identical data must survive the deletion.
    other = User(email="keep@example.com", hashed_password="x")
    session.add(other)
    await session.flush()
    other_item = await _add(session, other, title="keep", domain="HPC", state="active")
    session.add(Domain(owner_id=other.id, name="HPC"))
    session.add(
        Checkpoint(
            item_id=other_item.id,
            outcome="active",
            last_state="active",
            next_action="go",
            resume_from="here",
        )
    )
    await session.commit()

    await delete_account(session, user)
    await session.commit()

    assert revoked == ["rt"]  # upstream Google grant was revoked
    assert await session.get(User, user.id) is None
    for model, owner in (
        (Item, user.id),
        (Domain, user.id),
        (CalendarConnection, user.id),
    ):
        rows = await session.execute(
            select(model).where(model.owner_id == owner)
        )
        assert rows.scalars().first() is None
    cps = await session.execute(
        select(Checkpoint).where(Checkpoint.item_id == parent.id)
    )
    assert cps.scalars().first() is None

    # The bystander is untouched.
    assert await session.get(User, other.id) is not None
    keep = await session.execute(select(Item).where(Item.owner_id == other.id))
    assert keep.scalars().first() is not None
