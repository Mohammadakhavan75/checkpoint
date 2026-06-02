from datetime import datetime, timedelta, timezone

from fastapi import Depends, FastAPI, Header, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .database import Base, engine, get_db
from .models import Checkpoint, Domain, Mission, ParkingItem, RewardEvent, StateLog
from .schemas import (
    CheckpointCreate,
    CheckpointOut,
    DirectorOut,
    DomainCreate,
    DomainOut,
    DomainUpdate,
    MissionCreate,
    MissionOut,
    MissionUpdate,
    ParkingItemCreate,
    ParkingItemOut,
    ParkingItemUpdate,
    RewardEventOut,
    StateLogCreate,
    StateLogOut,
    TodayStartCreate,
    TodayOut,
)


app = FastAPI(title="Checkpoint Domain Service")

ENTRY_MOVE_FALLBACK = "Open the work surface and stay with it for two minutes."
RECOVERY_AFTER = timedelta(hours=24)


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)


def user_id(x_user_id: str = Header(alias="X-User-Id")) -> str:
    return x_user_id


def require_mission(db: Session, current_user_id: str, mission_id: str) -> Mission:
    mission = db.get(Mission, mission_id)
    if mission is None or mission.user_id != current_user_id:
        raise HTTPException(status_code=404, detail="Mission not found")
    return mission


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


def recovery_due_for(primary: Mission | None, last_checkpoint: Checkpoint | None, latest_mission_reward: RewardEvent | None) -> bool:
    if primary is None:
        return False
    activity_dates = [
        ensure_aware(last_checkpoint.created_at) if last_checkpoint else None,
        ensure_aware(latest_mission_reward.created_at) if latest_mission_reward else None,
    ]
    last_activity = max((date for date in activity_dates if date is not None), default=None)
    if last_activity is None:
        return False
    return utc_now() - last_activity > RECOVERY_AFTER


def entry_move_for(primary: Mission | None, last_checkpoint: Checkpoint | None) -> str:
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
    if state in {"Avoiding", "Overwhelmed"}:
        return "You broke avoidance. Momentum restored."
    if state == "Locked in":
        return "Motion started. Keep the lane clear."
    return "You crossed the start line. Momentum restored."


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
    recovery_due = recovery_due_for(primary, last_checkpoint, mission_reward)
    current_state = state.state if state else None
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
        entry_move=entry_move_for(primary, last_checkpoint),
        fallback_move="Make it smaller: open the work surface and touch only the first visible step.",
        reward_hint=hint,
        recommended_mode=recommended_mode,
        latest_reward=mission_reward,
    )


def create_reward(
    db: Session,
    current_user_id: str,
    *,
    kind: str,
    mission_id: str | None,
    message: str | None = None,
) -> RewardEvent:
    reward = RewardEvent(
        user_id=current_user_id,
        mission_id=mission_id,
        kind=kind,
        message=message or reward_message(kind),
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
        .where(Mission.user_id == current_user_id, Mission.status == "active")
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
    parked_missions = db.scalar(select(func.count()).select_from(Mission).where(Mission.user_id == current_user_id, Mission.status == "parked")) or 0
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
    state_log = StateLog(user_id=current_user_id, state=payload.state)
    db.add(state_log)
    db.commit()
    db.refresh(state_log)
    return state_log


@app.post("/today/start", response_model=RewardEventOut, status_code=status.HTTP_201_CREATED)
def start_today(
    payload: TodayStartCreate,
    current_user_id: str = Depends(user_id),
    db: Session = Depends(get_db),
) -> RewardEventOut:
    mission = require_mission(db, current_user_id, payload.mission_id)
    last_checkpoint = db.scalar(
        select(Checkpoint)
        .where(Checkpoint.user_id == current_user_id, Checkpoint.mission_id == mission.id)
        .order_by(Checkpoint.created_at.desc())
    )
    mission_reward = latest_reward(db, current_user_id, mission.id)
    is_recovery = payload.state == "Recovering" or recovery_due_for(mission, last_checkpoint, mission_reward)
    if is_recovery:
        kind = "returned_after_gap"
    elif last_checkpoint or mission_reward:
        kind = "resumed"
    else:
        kind = "started"
    state_log = StateLog(user_id=current_user_id, state=payload.state)
    db.add(state_log)
    reward = create_reward(
        db,
        current_user_id,
        kind=kind,
        mission_id=mission.id,
        message=reward_message(kind, payload.state),
    )
    db.commit()
    db.refresh(reward)
    return reward


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
    current_user_id: str = Depends(user_id),
    db: Session = Depends(get_db),
) -> list[MissionOut]:
    stmt = select(Mission).where(Mission.user_id == current_user_id)
    if status_filter:
        stmt = stmt.where(Mission.status == status_filter)
    stmt = stmt.order_by(Mission.status.asc(), Mission.active_rank.asc().nullslast(), Mission.updated_at.desc())
    return list(db.scalars(stmt).all())


ACTIVE_LIMIT = 3


def _active_missions(db: Session, user_id_val: str) -> list[Mission]:
    return list(
        db.scalars(
            select(Mission)
            .where(Mission.user_id == user_id_val, Mission.status == "active")
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
    mission = Mission(user_id=current_user_id, **payload.model_dump())
    if mission.status == "active":
        actives = _active_missions(db, current_user_id)
        if len(actives) >= ACTIVE_LIMIT:
            raise HTTPException(status_code=409, detail="active_set_full")
        mission.active_rank = _next_free_rank(actives)
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
    for key, value in updates.items():
        setattr(mission, key, value)
    db.commit()
    db.refresh(mission)
    return mission


@app.post("/missions/{mission_id}/activate", response_model=MissionOut)
def activate_mission(mission_id: str, current_user_id: str = Depends(user_id), db: Session = Depends(get_db)) -> MissionOut:
    mission = require_mission(db, current_user_id, mission_id)
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
    )
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
