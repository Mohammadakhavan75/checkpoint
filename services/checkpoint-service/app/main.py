from fastapi import Depends, FastAPI, Header, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .database import Base, engine, get_db
from .models import Checkpoint, Domain, Mission, ParkingItem
from .schemas import (
    CheckpointCreate,
    CheckpointOut,
    DomainCreate,
    DomainOut,
    DomainUpdate,
    MissionCreate,
    MissionOut,
    MissionUpdate,
    ParkingItemCreate,
    ParkingItemOut,
    ParkingItemUpdate,
    TodayOut,
)


app = FastAPI(title="Checkpoint Domain Service")


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
    )


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


@app.post("/missions", response_model=MissionOut, status_code=status.HTTP_201_CREATED)
def create_mission(
    payload: MissionCreate,
    active_limit: int = Query(default=1, ge=1, le=5),
    current_user_id: str = Depends(user_id),
    db: Session = Depends(get_db),
) -> MissionOut:
    if payload.domain_id and not db.scalar(select(Domain).where(Domain.id == payload.domain_id, Domain.user_id == current_user_id)):
        raise HTTPException(status_code=404, detail="Domain not found")
    mission = Mission(user_id=current_user_id, **payload.model_dump())
    if mission.status == "active":
        active_count = db.scalar(select(func.count()).select_from(Mission).where(Mission.user_id == current_user_id, Mission.status == "active")) or 0
        if active_count >= active_limit:
            raise HTTPException(status_code=409, detail="Active mission limit reached")
        mission.active_rank = active_count + 1
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
def activate_mission(
    mission_id: str,
    active_limit: int = Query(default=1, ge=1, le=5),
    current_user_id: str = Depends(user_id),
    db: Session = Depends(get_db),
) -> MissionOut:
    mission = require_mission(db, current_user_id, mission_id)
    if mission.status != "active":
        active_count = db.scalar(select(func.count()).select_from(Mission).where(Mission.user_id == current_user_id, Mission.status == "active")) or 0
        if active_count >= active_limit:
            raise HTTPException(status_code=409, detail="Active mission limit reached")
        mission.active_rank = active_count + 1
    mission.status = "active"
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
