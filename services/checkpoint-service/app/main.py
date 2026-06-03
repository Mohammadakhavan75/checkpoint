from datetime import datetime, timedelta, timezone

from fastapi import Depends, FastAPI, Header, HTTPException, Query, status
from sqlalchemy import func, inspect, select, text
from sqlalchemy.orm import Session

from .database import Base, engine, get_db
from .models import Checkpoint, Domain, Mission, ParkingItem, RewardEvent, StateLog, WorkSession
from .schemas import (
    CheckpointCreate,
    CheckpointOut,
    CompleteMissionCreate,
    DirectorOut,
    DomainCreate,
    DomainOut,
    DomainUpdate,
    MicroMissionCreate,
    MissionCreate,
    MissionOut,
    MissionUpdate,
    ParkingItemCreate,
    ParkingItemOut,
    ParkingItemUpdate,
    RewardEventOut,
    StateLogCreate,
    StateLogOut,
    TodayHeartbeatCreate,
    TodayStartCreate,
    TodayStartOut,
    TodayOut,
    WorkSessionOut,
)


app = FastAPI(title="Checkpoint Domain Service")

ENTRY_MOVE_FALLBACK = "Open the work surface and stay with it for two minutes."
RECOVERY_AFTER = timedelta(hours=24)

SCHEMA_COLUMN_MIGRATIONS = {
    "missions": [
        ("parent_id", "VARCHAR(36)"),
        ("mission_kind", "VARCHAR(32) NOT NULL DEFAULT 'standard'"),
        ("activation_energy", "VARCHAR(16) NOT NULL DEFAULT 'medium'"),
        ("cognitive_load", "VARCHAR(16) NOT NULL DEFAULT 'medium'"),
        ("emotional_resistance", "VARCHAR(16) NOT NULL DEFAULT 'medium'"),
        ("novelty", "VARCHAR(16) NOT NULL DEFAULT 'medium'"),
        ("est_minutes", "INTEGER NOT NULL DEFAULT 15"),
        ("reward_type", "VARCHAR(32) NOT NULL DEFAULT 'momentum'"),
    ],
    "state_logs": [
        ("energy_focus", "INTEGER"),
        ("energy_emotional", "INTEGER"),
        ("novelty_hunger", "INTEGER"),
    ],
    "reward_events": [
        ("momentum_delta", "INTEGER NOT NULL DEFAULT 0"),
        ("clarity_delta", "INTEGER NOT NULL DEFAULT 0"),
        ("resilience_delta", "INTEGER NOT NULL DEFAULT 0"),
        ("reason", "TEXT NOT NULL DEFAULT ''"),
    ],
}


@app.on_event("startup")
def on_startup() -> None:
    ensure_schema()


def ensure_schema() -> None:
    Base.metadata.create_all(bind=engine)
    with engine.begin() as connection:
        inspector = inspect(connection)
        for table_name, columns in SCHEMA_COLUMN_MIGRATIONS.items():
            if not inspector.has_table(table_name):
                continue
            existing_columns = {column["name"] for column in inspector.get_columns(table_name)}
            for column_name, ddl in columns:
                if column_name not in existing_columns:
                    connection.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {ddl}"))


def user_id(x_user_id: str = Header(alias="X-User-Id")) -> str:
    return x_user_id


def require_mission(db: Session, current_user_id: str, mission_id: str) -> Mission:
    mission = db.get(Mission, mission_id)
    if mission is None or mission.user_id != current_user_id:
        raise HTTPException(status_code=404, detail="Mission not found")
    return mission


def top_level_mission_for(mission: Mission, db: Session, current_user_id: str) -> Mission:
    if mission.parent_id is None:
        return mission
    return require_mission(db, current_user_id, mission.parent_id)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def ensure_aware(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def latest_state(db: Session, current_user_id: str) -> StateLog | None:
    return db.scalar(
        select(StateLog)
        .where(StateLog.user_id == current_user_id)
        .order_by(StateLog.created_at.desc())
    )


def latest_reward(db: Session, current_user_id: str, mission_id: str | None = None) -> RewardEvent | None:
    stmt = select(RewardEvent).where(RewardEvent.user_id == current_user_id)
    if mission_id is not None:
        stmt = stmt.where(RewardEvent.mission_id == mission_id)
    return db.scalar(stmt.order_by(RewardEvent.created_at.desc()))


def latest_open_session(db: Session, current_user_id: str, mission_id: str | None = None) -> WorkSession | None:
    stmt = select(WorkSession).where(WorkSession.user_id == current_user_id, WorkSession.ended_at.is_(None))
    if mission_id is not None:
        stmt = stmt.where(WorkSession.mission_id == mission_id)
    return db.scalar(stmt.order_by(WorkSession.last_heartbeat_at.desc()))


def open_session_is_stale(session: WorkSession | None) -> bool:
    if session is None:
        return False
    last_seen = ensure_aware(session.last_heartbeat_at)
    return last_seen is not None and utc_now() - last_seen > RECOVERY_AFTER


def reward_totals(db: Session, current_user_id: str) -> tuple[int, int]:
    totals = db.execute(
        select(
            func.coalesce(func.sum(RewardEvent.momentum_delta), 0),
            func.coalesce(func.sum(RewardEvent.resilience_delta), 0),
        ).where(RewardEvent.user_id == current_user_id)
    ).one()
    return max(int(totals[0]), 0), max(int(totals[1]), 0)


def reward_deltas(kind: str, reward_type: str | None = None) -> tuple[int, int, int]:
    if kind == "returned_after_gap":
        return 0, 0, 2
    if kind == "checkpoint_saved":
        return 0, 1, 0
    if kind == "completed":
        if reward_type in {"clarity", "exploration"}:
            return 1, 2, 0
        if reward_type == "resilience":
            return 1, 0, 2
        return 2, 0, 0
    if kind in {"started", "resumed"}:
        return 1, 0, 0
    return 0, 0, 0


def recovery_due_for(
    primary: Mission | None,
    last_checkpoint: Checkpoint | None,
    latest_mission_reward: RewardEvent | None,
    active_session: WorkSession | None = None,
) -> bool:
    if primary is None:
        return False
    if open_session_is_stale(active_session):
        return True
    activity_dates = [
        ensure_aware(last_checkpoint.created_at) if last_checkpoint else None,
        ensure_aware(latest_mission_reward.created_at) if latest_mission_reward else None,
        ensure_aware(active_session.last_heartbeat_at) if active_session else None,
    ]
    last_activity = max((date for date in activity_dates if date is not None), default=None)
    if last_activity is None:
        return False
    return utc_now() - last_activity > RECOVERY_AFTER


def micro_mission_entry(mission: Mission) -> str:
    return mission.next_action.strip() or mission.title.strip() or ENTRY_MOVE_FALLBACK


def entry_move_for(primary: Mission | None, last_checkpoint: Checkpoint | None, micro_mission: Mission | None = None) -> str:
    if micro_mission is not None:
        return micro_mission_entry(micro_mission)
    if last_checkpoint and last_checkpoint.next_action.strip():
        return last_checkpoint.next_action.strip()
    if primary and primary.next_action.strip():
        return primary.next_action.strip()
    return ENTRY_MOVE_FALLBACK


def reward_message(kind: str, state: str | None = None) -> str:
    if kind == "returned_after_gap":
        return "Return counts. Resilience restored."
    if kind == "checkpoint_saved":
        return "Checkpoint saved. Future you has a handle."
    if kind == "completed":
        return "Tiny move complete. Momentum banked."
    if state in {"Avoiding", "Overwhelmed"}:
        return "You broke avoidance. Momentum restored."
    if state == "Locked in":
        return "Motion started. Keep the lane clear."
    return "You crossed the start line. Momentum restored."


def recommended_micro_mission_for(db: Session, current_user_id: str, primary: Mission | None, state: str | None) -> Mission | None:
    if primary is None:
        return None
    candidates = list(
        db.scalars(
            select(Mission)
            .where(
                Mission.user_id == current_user_id,
                Mission.parent_id == primary.id,
                Mission.status != "completed",
            )
            .order_by(Mission.updated_at.desc())
        ).all()
    )
    if not candidates:
        return None
    if state in {"Avoiding", "Overwhelmed", "Recovering"}:
        low_candidates = [
            mission
            for mission in candidates
            if mission.est_minutes <= 8
            and mission.activation_energy == "low"
            and mission.cognitive_load == "low"
            and mission.emotional_resistance == "low"
        ]
        if low_candidates:
            return sorted(low_candidates, key=lambda mission: (mission.est_minutes, mission.updated_at), reverse=False)[0]
    return sorted(candidates, key=lambda mission: (mission.est_minutes, mission.updated_at), reverse=False)[0]


def start_or_resume_session(db: Session, current_user_id: str, mission_id: str) -> WorkSession:
    now = utc_now()
    current = latest_open_session(db, current_user_id, mission_id)
    if current is not None:
        current.last_heartbeat_at = now
        return current
    for session in db.scalars(select(WorkSession).where(WorkSession.user_id == current_user_id, WorkSession.ended_at.is_(None))).all():
        session.ended_at = now
        session.end_kind = "switched"
    session = WorkSession(user_id=current_user_id, mission_id=mission_id, started_at=now, last_heartbeat_at=now)
    db.add(session)
    return session


def end_open_sessions(db: Session, current_user_id: str, end_kind: str) -> None:
    now = utc_now()
    for session in db.scalars(select(WorkSession).where(WorkSession.user_id == current_user_id, WorkSession.ended_at.is_(None))).all():
        session.ended_at = now
        session.end_kind = end_kind


def director_for(
    db: Session,
    current_user_id: str,
    primary: Mission | None,
    last_checkpoint: Checkpoint | None,
) -> DirectorOut | None:
    if primary is None:
        return None
    state = latest_state(db, current_user_id)
    mission_reward = latest_reward(db, current_user_id, primary.id)
    active_session = latest_open_session(db, current_user_id)
    recovery_due = recovery_due_for(primary, last_checkpoint, mission_reward, active_session)
    current_state = state.state if state else None
    micro_mission = recommended_micro_mission_for(db, current_user_id, primary, current_state)
    momentum, resilience = reward_totals(db, current_user_id)
    if recovery_due or current_state == "Recovering":
        recommended_mode = "recovery"
        hint = reward_message("returned_after_gap", current_state)
    elif current_state in {"Avoiding", "Overwhelmed"}:
        recommended_mode = "low_state"
        hint = reward_message("started", current_state)
    elif current_state == "Locked in":
        recommended_mode = "locked_in"
        hint = reward_message("resumed", current_state)
    elif current_state == "Warming up":
        recommended_mode = "warming_up"
        hint = reward_message("started", current_state)
    else:
        recommended_mode = "check_in"
        hint = "Pick your state. The app will shrink the first move."
    return DirectorOut(
        current_state=current_state,
        recovery_due=recovery_due,
        entry_move=entry_move_for(primary, last_checkpoint, micro_mission),
        fallback_move="Make it smaller: open the work surface and touch only the first visible step.",
        reward_hint=hint,
        recommended_mode=recommended_mode,
        latest_reward=mission_reward,
        momentum=momentum,
        resilience=resilience,
        recommended_micro_mission=micro_mission,
        active_session=active_session,
        session_stale=open_session_is_stale(active_session),
    )


def create_reward(
    db: Session,
    current_user_id: str,
    *,
    kind: str,
    mission_id: str | None,
    message: str | None = None,
    reward_type: str | None = None,
    reason: str = "",
) -> RewardEvent:
    momentum_delta, clarity_delta, resilience_delta = reward_deltas(kind, reward_type)
    reward = RewardEvent(
        user_id=current_user_id,
        mission_id=mission_id,
        kind=kind,
        message=message or reward_message(kind),
        momentum_delta=max(momentum_delta, 0),
        clarity_delta=max(clarity_delta, 0),
        resilience_delta=max(resilience_delta, 0),
        reason=reason,
    )
    db.add(reward)
    return reward


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/today", response_model=TodayOut)
def get_today(current_user_id: str = Depends(user_id), db: Session = Depends(get_db)) -> TodayOut:
    active_stmt = (
        select(Mission)
        .where(Mission.user_id == current_user_id, Mission.status == "active", Mission.parent_id.is_(None))
        .order_by(Mission.active_rank.asc().nullslast(), Mission.updated_at.desc())
    )
    active_missions = list(db.scalars(active_stmt).all())
    primary = active_missions[0] if active_missions else None
    last_checkpoint = None
    if primary is not None:
        last_checkpoint = db.scalar(
            select(Checkpoint)
            .where(Checkpoint.user_id == current_user_id, Checkpoint.mission_id == primary.id)
            .order_by(Checkpoint.created_at.desc())
        )
    parking_count = db.scalar(select(func.count()).select_from(ParkingItem).where(ParkingItem.user_id == current_user_id)) or 0
    parked_missions = (
        db.scalar(
            select(func.count())
            .select_from(Mission)
            .where(Mission.user_id == current_user_id, Mission.status == "parked", Mission.parent_id.is_(None))
        )
        or 0
    )
    return TodayOut(
        primary_mission=primary,
        last_checkpoint=last_checkpoint,
        active_count=len(active_missions),
        parking_count=parking_count + parked_missions,
        director=director_for(db, current_user_id, primary, last_checkpoint),
    )


@app.post("/today/state", response_model=StateLogOut, status_code=status.HTTP_201_CREATED)
def create_state_log(
    payload: StateLogCreate,
    current_user_id: str = Depends(user_id),
    db: Session = Depends(get_db),
) -> StateLogOut:
    state_log = StateLog(
        user_id=current_user_id,
        state=payload.state,
        energy_focus=payload.energy_focus,
        energy_emotional=payload.energy_emotional,
        novelty_hunger=payload.novelty_hunger,
    )
    db.add(state_log)
    db.commit()
    db.refresh(state_log)
    return state_log


@app.post("/today/start", response_model=TodayStartOut, status_code=status.HTTP_201_CREATED)
def start_today(
    payload: TodayStartCreate,
    current_user_id: str = Depends(user_id),
    db: Session = Depends(get_db),
) -> TodayStartOut:
    mission = require_mission(db, current_user_id, payload.mission_id)
    activity_mission = top_level_mission_for(mission, db, current_user_id)
    last_checkpoint = db.scalar(
        select(Checkpoint)
        .where(Checkpoint.user_id == current_user_id, Checkpoint.mission_id == activity_mission.id)
        .order_by(Checkpoint.created_at.desc())
    )
    mission_reward = latest_reward(db, current_user_id, activity_mission.id)
    is_recovery = payload.state == "Recovering" or recovery_due_for(activity_mission, last_checkpoint, mission_reward)
    if is_recovery:
        kind = "returned_after_gap"
    elif last_checkpoint or mission_reward:
        kind = "resumed"
    else:
        kind = "started"
    state_log = StateLog(user_id=current_user_id, state=payload.state)
    db.add(state_log)
    session = start_or_resume_session(db, current_user_id, mission.id)
    reward = create_reward(
        db,
        current_user_id,
        kind=kind,
        mission_id=mission.id,
        message=reward_message(kind, payload.state),
        reward_type=mission.reward_type,
        reason=payload.action_text,
    )
    db.commit()
    db.refresh(reward)
    db.refresh(session)
    return TodayStartOut(**RewardEventOut.model_validate(reward).model_dump(), session=session)


@app.post("/today/heartbeat", response_model=WorkSessionOut)
def heartbeat_today(
    payload: TodayHeartbeatCreate,
    current_user_id: str = Depends(user_id),
    db: Session = Depends(get_db),
) -> WorkSessionOut:
    session = latest_open_session(db, current_user_id, payload.mission_id)
    if session is None:
        raise HTTPException(status_code=404, detail="No active session")
    session.last_heartbeat_at = utc_now()
    db.commit()
    db.refresh(session)
    return session


@app.get("/domains", response_model=list[DomainOut])
def list_domains(current_user_id: str = Depends(user_id), db: Session = Depends(get_db)) -> list[DomainOut]:
    return list(db.scalars(select(Domain).where(Domain.user_id == current_user_id).order_by(Domain.created_at.asc())).all())


@app.post("/domains", response_model=DomainOut, status_code=status.HTTP_201_CREATED)
def create_domain(payload: DomainCreate, current_user_id: str = Depends(user_id), db: Session = Depends(get_db)) -> DomainOut:
    domain = Domain(user_id=current_user_id, name=payload.name.strip())
    db.add(domain)
    db.commit()
    db.refresh(domain)
    return domain


@app.delete("/domains/{domain_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_domain(domain_id: str, current_user_id: str = Depends(user_id), db: Session = Depends(get_db)) -> None:
    domain = db.get(Domain, domain_id)
    if domain is None or domain.user_id != current_user_id:
        raise HTTPException(status_code=404, detail="Domain not found")
    in_use = db.scalar(select(func.count()).select_from(Mission).where(Mission.domain_id == domain_id)) or 0
    if in_use > 0:
        raise HTTPException(status_code=409, detail="Domain is in use by one or more missions")
    db.delete(domain)
    db.commit()


@app.patch("/domains/{domain_id}", response_model=DomainOut)
def update_domain(domain_id: str, payload: DomainUpdate, current_user_id: str = Depends(user_id), db: Session = Depends(get_db)) -> DomainOut:
    domain = db.get(Domain, domain_id)
    if domain is None or domain.user_id != current_user_id:
        raise HTTPException(status_code=404, detail="Domain not found")
    if payload.name is not None:
        domain.name = payload.name.strip()
    db.commit()
    db.refresh(domain)
    return domain


@app.get("/missions/{mission_id}", response_model=MissionOut)
def get_mission(mission_id: str, current_user_id: str = Depends(user_id), db: Session = Depends(get_db)) -> MissionOut:
    return require_mission(db, current_user_id, mission_id)


@app.get("/missions", response_model=list[MissionOut])
def list_missions(
    status_filter: str | None = Query(default=None, alias="status"),
    parent_id_filter: str | None = Query(default=None, alias="parent_id"),
    include_children: bool = Query(default=False),
    current_user_id: str = Depends(user_id),
    db: Session = Depends(get_db),
) -> list[MissionOut]:
    stmt = select(Mission).where(Mission.user_id == current_user_id)
    if status_filter:
        stmt = stmt.where(Mission.status == status_filter)
    if parent_id_filter is not None:
        stmt = stmt.where(Mission.parent_id == parent_id_filter)
    elif not include_children:
        stmt = stmt.where(Mission.parent_id.is_(None))
    stmt = stmt.order_by(Mission.status.asc(), Mission.active_rank.asc().nullslast(), Mission.updated_at.desc())
    return list(db.scalars(stmt).all())


ACTIVE_LIMIT = 3


def _active_missions(db: Session, user_id_val: str) -> list[Mission]:
    return list(
        db.scalars(
            select(Mission)
            .where(Mission.user_id == user_id_val, Mission.status == "active", Mission.parent_id.is_(None))
            .order_by(Mission.active_rank.asc().nullslast())
        ).all()
    )


def _next_free_rank(actives: list[Mission]) -> int:
    used = {m.active_rank for m in actives if m.active_rank is not None}
    if 1 not in used:
        return 1
    for r in (2, 3):
        if r not in used:
            return r
    return len(actives) + 1


@app.post("/missions", response_model=MissionOut, status_code=status.HTTP_201_CREATED)
def create_mission(
    payload: MissionCreate,
    current_user_id: str = Depends(user_id),
    db: Session = Depends(get_db),
) -> MissionOut:
    if payload.domain_id and not db.scalar(select(Domain).where(Domain.id == payload.domain_id, Domain.user_id == current_user_id)):
        raise HTTPException(status_code=404, detail="Domain not found")
    if payload.parent_id:
        parent = require_mission(db, current_user_id, payload.parent_id)
        if parent.parent_id is not None:
            raise HTTPException(status_code=409, detail="Nested micro-missions are not supported")
    mission = Mission(user_id=current_user_id, **payload.model_dump())
    if mission.status == "active" and mission.parent_id is None:
        actives = _active_missions(db, current_user_id)
        if len(actives) >= ACTIVE_LIMIT:
            raise HTTPException(status_code=409, detail="active_set_full")
        mission.active_rank = _next_free_rank(actives)
    if mission.parent_id is not None:
        mission.active_rank = None
    db.add(mission)
    db.commit()
    db.refresh(mission)
    return mission


@app.patch("/missions/{mission_id}", response_model=MissionOut)
def update_mission(mission_id: str, payload: MissionUpdate, current_user_id: str = Depends(user_id), db: Session = Depends(get_db)) -> MissionOut:
    mission = require_mission(db, current_user_id, mission_id)
    updates = payload.model_dump(exclude_unset=True)
    if "domain_id" in updates and updates["domain_id"]:
        if not db.scalar(select(Domain).where(Domain.id == updates["domain_id"], Domain.user_id == current_user_id)):
            raise HTTPException(status_code=404, detail="Domain not found")
    if "parent_id" in updates and updates["parent_id"]:
        parent = require_mission(db, current_user_id, updates["parent_id"])
        if parent.id == mission.id or parent.parent_id is not None:
            raise HTTPException(status_code=409, detail="Invalid parent mission")
    for key, value in updates.items():
        setattr(mission, key, value)
    if mission.parent_id is not None:
        mission.active_rank = None
    db.commit()
    db.refresh(mission)
    return mission


@app.post("/missions/{mission_id}/activate", response_model=MissionOut)
def activate_mission(mission_id: str, current_user_id: str = Depends(user_id), db: Session = Depends(get_db)) -> MissionOut:
    mission = require_mission(db, current_user_id, mission_id)
    if mission.parent_id is not None:
        mission.status = "active"
        mission.active_rank = None
        db.commit()
        db.refresh(mission)
        return mission
    if mission.status != "active":
        actives = _active_missions(db, current_user_id)
        if len(actives) >= ACTIVE_LIMIT:
            raise HTTPException(status_code=409, detail="active_set_full")
        mission.active_rank = _next_free_rank(actives)
    mission.status = "active"
    db.commit()
    db.refresh(mission)
    return mission


@app.post("/missions/{mission_id}/promote", response_model=MissionOut)
def promote_mission(mission_id: str, current_user_id: str = Depends(user_id), db: Session = Depends(get_db)) -> MissionOut:
    mission = require_mission(db, current_user_id, mission_id)
    if mission.parent_id is not None:
        raise HTTPException(status_code=409, detail="Micro-missions cannot be primary")
    if mission.status != "active":
        raise HTTPException(status_code=409, detail="Mission is not active")
    if mission.active_rank == 1:
        raise HTTPException(status_code=409, detail="Mission is already primary")
    current_primary = db.scalar(
        select(Mission).where(Mission.user_id == current_user_id, Mission.status == "active", Mission.active_rank == 1)
    )
    old_rank = mission.active_rank
    mission.active_rank = 1
    if current_primary:
        current_primary.active_rank = old_rank
    db.commit()
    db.refresh(mission)
    return mission


@app.post("/missions/{mission_id}/demote", response_model=MissionOut)
def demote_mission(mission_id: str, current_user_id: str = Depends(user_id), db: Session = Depends(get_db)) -> MissionOut:
    mission = require_mission(db, current_user_id, mission_id)
    if mission.parent_id is not None:
        raise HTTPException(status_code=409, detail="Micro-missions cannot be demoted")
    if mission.status != "active":
        raise HTTPException(status_code=409, detail="Mission is not active")
    if mission.active_rank != 1:
        raise HTTPException(status_code=409, detail="Mission is not primary")
    used_ranks = set(
        db.scalars(
            select(Mission.active_rank).where(
                Mission.user_id == current_user_id,
                Mission.status == "active",
                Mission.active_rank != 1,
            )
        ).all()
    )
    new_rank = next(r for r in (2, 3) if r not in used_ranks)
    mission.active_rank = new_rank
    db.commit()
    db.refresh(mission)
    return mission


@app.post("/missions/{mission_id}/park", response_model=MissionOut)
def park_mission(mission_id: str, current_user_id: str = Depends(user_id), db: Session = Depends(get_db)) -> MissionOut:
    mission = require_mission(db, current_user_id, mission_id)
    mission.status = "parked"
    mission.active_rank = None
    db.commit()
    db.refresh(mission)
    return mission


@app.delete("/missions/{mission_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_mission(mission_id: str, current_user_id: str = Depends(user_id), db: Session = Depends(get_db)) -> None:
    mission = require_mission(db, current_user_id, mission_id)
    db.delete(mission)
    db.commit()


@app.get("/missions/{mission_id}/micro-missions", response_model=list[MissionOut])
def list_micro_missions(mission_id: str, current_user_id: str = Depends(user_id), db: Session = Depends(get_db)) -> list[MissionOut]:
    require_mission(db, current_user_id, mission_id)
    return list(
        db.scalars(
            select(Mission)
            .where(Mission.user_id == current_user_id, Mission.parent_id == mission_id)
            .order_by(Mission.status.asc(), Mission.est_minutes.asc(), Mission.updated_at.desc())
        ).all()
    )


@app.post("/missions/{mission_id}/micro-missions", response_model=MissionOut, status_code=status.HTTP_201_CREATED)
def create_micro_mission(
    mission_id: str,
    payload: MicroMissionCreate,
    current_user_id: str = Depends(user_id),
    db: Session = Depends(get_db),
) -> MissionOut:
    parent = require_mission(db, current_user_id, mission_id)
    if parent.parent_id is not None:
        raise HTTPException(status_code=409, detail="Nested micro-missions are not supported")
    mission_kind = "exploration" if payload.reward_type == "exploration" else "recovery" if payload.reward_type == "resilience" else "momentum"
    micro_mission = Mission(
        user_id=current_user_id,
        domain_id=parent.domain_id,
        parent_id=parent.id,
        title=payload.title.strip(),
        status="active",
        active_rank=None,
        mission_kind=mission_kind,
        activation_energy=payload.activation_energy,
        cognitive_load=payload.cognitive_load,
        emotional_resistance=payload.emotional_resistance,
        novelty=payload.novelty,
        est_minutes=payload.est_minutes,
        reward_type=payload.reward_type,
        next_action=payload.next_action.strip() or payload.title.strip(),
        do_not_rethink=parent.do_not_rethink,
        why_matters=parent.why_matters,
    )
    db.add(micro_mission)
    db.commit()
    db.refresh(micro_mission)
    return micro_mission


@app.post("/missions/{mission_id}/complete", response_model=RewardEventOut, status_code=status.HTTP_201_CREATED)
def complete_mission(
    mission_id: str,
    payload: CompleteMissionCreate,
    current_user_id: str = Depends(user_id),
    db: Session = Depends(get_db),
) -> RewardEventOut:
    mission = require_mission(db, current_user_id, mission_id)
    mission.status = "completed"
    mission.active_rank = None
    end_open_sessions(db, current_user_id, "completed")
    reward = create_reward(
        db,
        current_user_id,
        kind="completed",
        mission_id=mission.id,
        message=reward_message("completed"),
        reward_type=mission.reward_type,
        reason=payload.completion_note,
    )
    db.commit()
    db.refresh(reward)
    return reward


@app.get("/missions/{mission_id}/checkpoints", response_model=list[CheckpointOut])
def list_checkpoints(mission_id: str, current_user_id: str = Depends(user_id), db: Session = Depends(get_db)) -> list[CheckpointOut]:
    require_mission(db, current_user_id, mission_id)
    return list(
        db.scalars(
            select(Checkpoint)
            .where(Checkpoint.user_id == current_user_id, Checkpoint.mission_id == mission_id)
            .order_by(Checkpoint.created_at.desc())
        ).all()
    )


@app.post("/missions/{mission_id}/checkpoints", response_model=CheckpointOut, status_code=status.HTTP_201_CREATED)
def create_checkpoint(
    mission_id: str,
    payload: CheckpointCreate,
    current_user_id: str = Depends(user_id),
    db: Session = Depends(get_db),
) -> CheckpointOut:
    mission = require_mission(db, current_user_id, mission_id)
    checkpoint = Checkpoint(user_id=current_user_id, mission_id=mission_id, **payload.model_dump())
    mission.current_state = payload.where_stopped or payload.changed or mission.current_state
    mission.last_decision = payload.decision or mission.last_decision
    mission.next_action = payload.next_action
    mission.do_not_rethink = payload.do_not_rethink
    mission.reentry_note = payload.where_stopped or mission.reentry_note
    db.add(checkpoint)
    create_reward(
        db,
        current_user_id,
        kind="checkpoint_saved",
        mission_id=mission_id,
        message=reward_message("checkpoint_saved"),
        reward_type=mission.reward_type,
        reason=payload.where_stopped or payload.changed,
    )
    end_open_sessions(db, current_user_id, "checkpoint_saved")
    db.commit()
    db.refresh(checkpoint)
    return checkpoint


@app.get("/parking-items", response_model=list[ParkingItemOut])
def list_parking_items(current_user_id: str = Depends(user_id), db: Session = Depends(get_db)) -> list[ParkingItemOut]:
    return list(db.scalars(select(ParkingItem).where(ParkingItem.user_id == current_user_id).order_by(ParkingItem.created_at.desc())).all())


@app.post("/parking-items", response_model=ParkingItemOut, status_code=status.HTTP_201_CREATED)
def create_parking_item(payload: ParkingItemCreate, current_user_id: str = Depends(user_id), db: Session = Depends(get_db)) -> ParkingItemOut:
    item = ParkingItem(user_id=current_user_id, title=payload.title.strip(), note=payload.note)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@app.patch("/parking-items/{item_id}", response_model=ParkingItemOut)
def update_parking_item(item_id: str, payload: ParkingItemUpdate, current_user_id: str = Depends(user_id), db: Session = Depends(get_db)) -> ParkingItemOut:
    item = db.get(ParkingItem, item_id)
    if item is None or item.user_id != current_user_id:
        raise HTTPException(status_code=404, detail="Parking item not found")
    if payload.title is not None:
        item.title = payload.title.strip()
    if payload.note is not None:
        item.note = payload.note
    db.commit()
    db.refresh(item)
    return item


@app.delete("/parking-items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_parking_item(item_id: str, current_user_id: str = Depends(user_id), db: Session = Depends(get_db)) -> None:
    item = db.get(ParkingItem, item_id)
    if item is None or item.user_id != current_user_id:
        raise HTTPException(status_code=404, detail="Parking item not found")
    db.delete(item)
    db.commit()
