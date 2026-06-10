"""Pydantic request/response models. Explicit models, never raw dicts."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

StateLiteral = Literal[
    "idea",
    "needsdef",
    "active",
    "scout",
    "blocked",
    "waiting",
    "deferred",
    "done",
    "killed",
]
OutcomeLiteral = Literal["active", "deferred", "blocked", "done"]
ProcedureLiteral = Literal["known", "unknown"]
ScopeLiteral = Literal["bounded", "unbounded"]


# ----- auth -----
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class GoogleLoginRequest(BaseModel):
    credential: str  # the Google ID token (JWT) from Google Identity Services


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    email: EmailStr
    name: Optional[str] = None
    picture: Optional[str] = None
    last_seen_version: Optional[str] = None
    created_at: datetime
    # lets the client offer "set a password" to Google-only accounts
    has_password: bool = True


class SetPasswordRequest(BaseModel):
    password: str = Field(min_length=6)
    # required when the account already has a password (change vs first set)
    current_password: Optional[str] = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class SeenVersionRequest(BaseModel):
    version: str = Field(min_length=1, max_length=40)


# ----- checkpoints -----
class CheckpointCreate(BaseModel):
    outcome: OutcomeLiteral
    last_state: str = Field(min_length=1)
    what_changed: Optional[str] = None
    problems: Optional[str] = None
    next_action: str = Field(min_length=1)
    resume_from: str = Field(min_length=1)
    do_not_redo: Optional[str] = None


class CheckpointOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    item_id: uuid.UUID
    outcome: str
    last_state: str
    what_changed: Optional[str] = None
    problems: Optional[str] = None
    next_action: str
    resume_from: str
    do_not_redo: Optional[str] = None
    created_at: datetime


# ----- snapshots -----
class SnapshotCreate(BaseModel):
    title: Optional[str] = None
    note: Optional[str] = None

    @model_validator(mode="after")
    def _require_content(self) -> "SnapshotCreate":
        if not (self.note and self.note.strip()):
            raise ValueError("a snapshot needs a note")
        return self


class SnapshotUpdate(BaseModel):
    title: Optional[str] = None
    note: Optional[str] = None

    @model_validator(mode="after")
    def _require_content(self) -> "SnapshotUpdate":
        # If note is provided, it must not be empty
        if self.note is not None and not self.note.strip():
            raise ValueError("snapshot note cannot be empty")
        return self


class SnapshotOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    item_id: uuid.UUID
    title: Optional[str] = None
    note: Optional[str] = None
    created_at: datetime


# ----- items -----
class ItemCreate(BaseModel):
    title: str = Field(min_length=1)
    domain: str
    state: StateLiteral = "idea"
    mode: Optional[str] = None
    parent_id: Optional[uuid.UUID] = None
    procedure: Optional[ProcedureLiteral] = None
    scope: Optional[ScopeLiteral] = None
    fields: dict = Field(default_factory=dict)


class ItemUpdate(BaseModel):
    title: Optional[str] = None
    domain: Optional[str] = None
    state: Optional[StateLiteral] = None
    mode: Optional[str] = None
    daily: Optional[bool] = None
    compiled: Optional[bool] = None
    procedure: Optional[ProcedureLiteral] = None
    scope: Optional[ScopeLiteral] = None
    fields: Optional[dict] = None


class PhaseInput(BaseModel):
    id: Optional[uuid.UUID] = None
    title: str = ""
    firstAction: str = ""  # noqa: N815 - mirrors the jsonb key used by the client


class CompileRequest(BaseModel):
    title: Optional[str] = None
    mode: Optional[str] = None
    description: Optional[str] = None
    firstAction: Optional[str] = None  # noqa: N815
    risk: Optional[str] = None
    procedure: Optional[ProcedureLiteral] = None
    scope: Optional[ScopeLiteral] = None
    phases: Optional[list[PhaseInput]] = None


class DomainCreate(BaseModel):
    name: str = Field(min_length=1, max_length=40)


class DomainOut(BaseModel):
    id: Optional[uuid.UUID] = None
    name: str
    count: int = 0


class CaptureRequest(BaseModel):
    text: str = Field(min_length=1)
    # Optional target domain. When set, the item is captured straight into that
    # domain ("Fast Task Domain") instead of the reservoir.
    domain: Optional[str] = None


class PromoteRequest(BaseModel):
    domain: str


class StateRequest(BaseModel):
    state: StateLiteral


class DailyRequest(BaseModel):
    daily: bool


class ItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    owner_id: uuid.UUID
    parent_id: Optional[uuid.UUID] = None
    title: str
    domain: str
    state: str
    mode: Optional[str] = None
    daily: bool
    compiled: bool
    procedure: Optional[str] = None
    scope: Optional[str] = None
    fields: dict
    created_at: datetime
    updated_at: datetime
    # computed / assembled fields
    is_parent: bool = False
    children: list["ItemOut"] = Field(default_factory=list)
    latest_checkpoint: Optional[CheckpointOut] = None


ItemOut.model_rebuild()
