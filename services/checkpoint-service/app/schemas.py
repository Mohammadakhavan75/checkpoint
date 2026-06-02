from datetime import datetime

from pydantic import BaseModel, Field


class DomainCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class DomainUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)


class DomainOut(BaseModel):
    id: str
    name: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MissionCreate(BaseModel):
    title: str = Field(min_length=1, max_length=240)
    domain_id: str | None = None
    status: str = Field(default="parked", pattern="^(active|parked|completed)$")
    why_matters: str = ""
    success_condition: str = ""
    current_state: str = ""
    last_decision: str = ""
    blockers: str = ""
    files_links: str = ""
    reentry_note: str = ""
    next_action: str = ""
    do_not_rethink: str = ""


class MissionUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=240)
    domain_id: str | None = None
    status: str | None = Field(default=None, pattern="^(active|parked|completed)$")
    why_matters: str | None = None
    success_condition: str | None = None
    current_state: str | None = None
    last_decision: str | None = None
    blockers: str | None = None
    files_links: str | None = None
    reentry_note: str | None = None
    next_action: str | None = None
    do_not_rethink: str | None = None


class MissionOut(BaseModel):
    id: str
    domain_id: str | None
    title: str
    status: str
    active_rank: int | None
    why_matters: str
    success_condition: str
    current_state: str
    last_decision: str
    blockers: str
    files_links: str
    reentry_note: str
    next_action: str
    do_not_rethink: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CheckpointCreate(BaseModel):
    changed: str = ""
    decision: str = ""
    where_stopped: str = ""
    next_action: str = Field(min_length=1)
    do_not_rethink: str = ""


class CheckpointOut(BaseModel):
    id: str
    mission_id: str
    changed: str
    decision: str
    where_stopped: str
    next_action: str
    do_not_rethink: str
    created_at: datetime

    model_config = {"from_attributes": True}


class StateLogCreate(BaseModel):
    state: str = Field(pattern="^(Avoiding|Overwhelmed|Warming up|Locked in|Recovering)$")


class StateLogOut(BaseModel):
    id: str
    user_id: str
    state: str
    created_at: datetime

    model_config = {"from_attributes": True}


class TodayStartCreate(BaseModel):
    mission_id: str
    state: str = Field(pattern="^(Avoiding|Overwhelmed|Warming up|Locked in|Recovering)$")
    action_text: str = Field(min_length=1)


class RewardEventOut(BaseModel):
    id: str
    user_id: str
    mission_id: str | None
    kind: str
    message: str
    created_at: datetime

    model_config = {"from_attributes": True}


class DirectorOut(BaseModel):
    current_state: str | None
    recovery_due: bool
    entry_move: str
    fallback_move: str
    reward_hint: str
    recommended_mode: str
    latest_reward: RewardEventOut | None = None


class ParkingItemCreate(BaseModel):
    title: str = Field(min_length=1, max_length=240)
    note: str = ""


class ParkingItemUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=240)
    note: str | None = None


class ParkingItemOut(BaseModel):
    id: str
    title: str
    note: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TodayOut(BaseModel):
    primary_mission: MissionOut | None
    last_checkpoint: CheckpointOut | None
    active_count: int
    parking_count: int
    director: DirectorOut | None = None
