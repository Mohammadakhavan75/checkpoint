import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def uuid_str() -> str:
    return str(uuid.uuid4())


class Domain(Base):
    __tablename__ = "domains"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    user_id: Mapped[str] = mapped_column(String(36), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc, nullable=False)

    missions: Mapped[list["Mission"]] = relationship(back_populates="domain")


class Mission(Base):
    __tablename__ = "missions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    user_id: Mapped[str] = mapped_column(String(36), index=True, nullable=False)
    domain_id: Mapped[str] = mapped_column(String(36), ForeignKey("domains.id"), nullable=True)
    parent_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("missions.id"), index=True, nullable=True)
    title: Mapped[str] = mapped_column(String(240), nullable=False)
    status: Mapped[str] = mapped_column(String(24), default="parked", index=True, nullable=False)
    active_rank: Mapped[int] = mapped_column(Integer, nullable=True)
    mission_kind: Mapped[str] = mapped_column(String(32), default="standard", server_default="standard", nullable=False)
    activation_energy: Mapped[str] = mapped_column(String(16), default="medium", server_default="medium", nullable=False)
    cognitive_load: Mapped[str] = mapped_column(String(16), default="medium", server_default="medium", nullable=False)
    emotional_resistance: Mapped[str] = mapped_column(String(16), default="medium", server_default="medium", nullable=False)
    novelty: Mapped[str] = mapped_column(String(16), default="medium", server_default="medium", nullable=False)
    est_minutes: Mapped[int] = mapped_column(Integer, default=15, server_default="15", nullable=False)
    reward_type: Mapped[str] = mapped_column(String(32), default="momentum", server_default="momentum", nullable=False)
    why_matters: Mapped[str] = mapped_column(Text, default="", nullable=False)
    success_condition: Mapped[str] = mapped_column(Text, default="", nullable=False)
    current_state: Mapped[str] = mapped_column(Text, default="", nullable=False)
    last_decision: Mapped[str] = mapped_column(Text, default="", nullable=False)
    blockers: Mapped[str] = mapped_column(Text, default="", nullable=False)
    files_links: Mapped[str] = mapped_column(Text, default="", nullable=False)
    reentry_note: Mapped[str] = mapped_column(Text, default="", nullable=False)
    next_action: Mapped[str] = mapped_column(Text, default="", nullable=False)
    do_not_rethink: Mapped[str] = mapped_column(Text, default="", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc, nullable=False)

    domain: Mapped[Domain] = relationship(back_populates="missions")
    checkpoints: Mapped[list["Checkpoint"]] = relationship(back_populates="mission", cascade="all, delete-orphan")


class Checkpoint(Base):
    __tablename__ = "checkpoints"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    user_id: Mapped[str] = mapped_column(String(36), index=True, nullable=False)
    mission_id: Mapped[str] = mapped_column(String(36), ForeignKey("missions.id"), index=True, nullable=False)
    changed: Mapped[str] = mapped_column(Text, default="", nullable=False)
    decision: Mapped[str] = mapped_column(Text, default="", nullable=False)
    where_stopped: Mapped[str] = mapped_column(Text, default="", nullable=False)
    next_action: Mapped[str] = mapped_column(Text, default="", nullable=False)
    do_not_rethink: Mapped[str] = mapped_column(Text, default="", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)

    mission: Mapped[Mission] = relationship(back_populates="checkpoints")


class StateLog(Base):
    __tablename__ = "state_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    user_id: Mapped[str] = mapped_column(String(36), index=True, nullable=False)
    state: Mapped[str] = mapped_column(String(32), nullable=False)
    energy_focus: Mapped[int | None] = mapped_column(Integer, nullable=True)
    energy_emotional: Mapped[int | None] = mapped_column(Integer, nullable=True)
    novelty_hunger: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)


class RewardEvent(Base):
    __tablename__ = "reward_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    user_id: Mapped[str] = mapped_column(String(36), index=True, nullable=False)
    mission_id: Mapped[str] = mapped_column(String(36), ForeignKey("missions.id"), index=True, nullable=True)
    kind: Mapped[str] = mapped_column(String(40), nullable=False)
    message: Mapped[str] = mapped_column(Text, default="", nullable=False)
    momentum_delta: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    clarity_delta: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    resilience_delta: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    reason: Mapped[str] = mapped_column(Text, default="", server_default="", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)


class WorkSession(Base):
    __tablename__ = "work_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    user_id: Mapped[str] = mapped_column(String(36), index=True, nullable=False)
    mission_id: Mapped[str] = mapped_column(String(36), ForeignKey("missions.id"), index=True, nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)
    last_heartbeat_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    end_kind: Mapped[str | None] = mapped_column(String(40), nullable=True)


class ParkingItem(Base):
    __tablename__ = "parking_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    user_id: Mapped[str] = mapped_column(String(36), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(240), nullable=False)
    note: Mapped[str] = mapped_column(Text, default="", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc, nullable=False)
