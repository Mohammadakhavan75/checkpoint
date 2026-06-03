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
    parent_id: str | None = None
    status: str = Field(default="parked", pattern="^(active|parked|completed)$")
    mission_kind: str = Field(default="standard", pattern="^(exploration|momentum|boss|recovery|maintenance|standard)$")
    activation_energy: str = Field(default="medium", pattern="^(low|medium|high)$")
    cognitive_load: str = Field(default="medium", pattern="^(low|medium|high)$")
    emotional_resistance: str = Field(default="medium", pattern="^(low|medium|high)$")
    novelty: str = Field(default="medium", pattern="^(low|medium|high)$")
    est_minutes: int = Field(default=15, ge=1, le=240)
    reward_type: str = Field(default="momentum", pattern="^(momentum|clarity|resilience|stability|exploration|courage)$")
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
    parent_id: str | None = None
    status: str | None = Field(default=None, pattern="^(active|parked|completed)$")
    mission_kind: str | None = Field(default=None, pattern="^(exploration|momentum|boss|recovery|maintenance|standard)$")
    activation_energy: str | None = Field(default=None, pattern="^(low|medium|high)$")
    cognitive_load: str | None = Field(default=None, pattern="^(low|medium|high)$")
    emotional_resistance: str | None = Field(default=None, pattern="^(low|medium|high)$")
    novelty: str | None = Field(default=None, pattern="^(low|medium|high)$")
    est_minutes: int | None = Field(default=None, ge=1, le=240)
    reward_type: str | None = Field(default=None, pattern="^(momentum|clarity|resilience|stability|exploration|courage)$")
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
    parent_id: str | None
    title: str
    status: str
    active_rank: int | None
    mission_kind: str
    activation_energy: str
    cognitive_load: str
    emotional_resistance: str
    novelty: str
    est_minutes: int
    reward_type: str
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
    energy_focus: int | None = Field(default=None, ge=0, le=10)
    energy_emotional: int | None = Field(default=None, ge=0, le=10)
    novelty_hunger: int | None = Field(default=None, ge=0, le=10)


class StateLogOut(BaseModel):
    id: str
    user_id: str
    state: str
    energy_focus: int | None
    energy_emotional: int | None
    novelty_hunger: int | None
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
    momentum_delta: int
    clarity_delta: int
    resilience_delta: int
    reason: str
    created_at: datetime

    model_config = {"from_attributes": True}


class WorkSessionOut(BaseModel):
    id: str
    user_id: str
    mission_id: str
    started_at: datetime
    last_heartbeat_at: datetime
    ended_at: datetime | None
    end_kind: str | None

    model_config = {"from_attributes": True}


class TodayStartOut(RewardEventOut):
    session: WorkSessionOut | None = None


class MicroMissionCreate(BaseModel):
    title: str = Field(min_length=1, max_length=240)
    next_action: str = ""
    activation_energy: str = Field(default="low", pattern="^(low|medium|high)$")
    cognitive_load: str = Field(default="low", pattern="^(low|medium|high)$")
    emotional_resistance: str = Field(default="low", pattern="^(low|medium|high)$")
    novelty: str = Field(default="medium", pattern="^(low|medium|high)$")
    est_minutes: int = Field(default=2, ge=1, le=8)
    reward_type: str = Field(default="momentum", pattern="^(momentum|clarity|resilience|stability|exploration|courage)$")


class CompleteMissionCreate(BaseModel):
    completion_note: str = ""


class TodayHeartbeatCreate(BaseModel):
    mission_id: str | None = None


class DirectorOut(BaseModel):
    current_state: str | None
    recovery_due: bool
    entry_move: str
    fallback_move: str
    reward_hint: str
    recommended_mode: str
    latest_reward: RewardEventOut | None = None
    momentum: int = 0
    resilience: int = 0
    recommended_micro_mission: MissionOut | None = None
    active_session: WorkSessionOut | None = None
    session_stale: bool = False


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
