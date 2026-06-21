export type ItemState =
  | "idea"
  | "needsdef"
  | "active"
  | "scout"
  | "blocked"
  | "waiting"
  | "deferred"
  | "done"
  | "killed";

export type Outcome = "active" | "deferred" | "blocked" | "done";
export type Procedure = "known" | "unknown";
export type Scope = "bounded" | "unbounded";
export type Tab = "today" | "ready" | "reservoir" | "domain" | "trash";

export interface Checkpoint {
  id: string;
  item_id: string;
  outcome: Outcome;
  last_state: string;
  what_changed?: string | null;
  problems?: string | null;
  next_action: string;
  resume_from: string;
  do_not_redo?: string | null;
  created_at: string;
}

// POST /items/{id}/checkpoints response: the server flags the user's first
// self-authored checkpoint (seeded tutorial receipts never count) so the
// client can show the one-time first-checkpoint reveal.
export interface CheckpointSaved extends Checkpoint {
  first_user_checkpoint?: boolean;
}

export interface Snapshot {
  id: string;
  item_id: string;
  title?: string | null;
  note?: string | null;
  created_at: string;
}

export interface SnapshotPayload {
  title?: string;
  note?: string;
}

export interface ItemFields {
  description?: string;
  firstAction?: string;
  risk?: string;
  resumeFrom?: string;
  whyNow?: string;
  output?: string;
  minWin?: string;
  stopRule?: string;
  checkpointRule?: string;
  [key: string]: string | undefined;
}

export interface Item {
  id: string;
  owner_id: string;
  parent_id?: string | null;
  title: string;
  domain: string;
  state: ItemState;
  mode?: string | null;
  daily: boolean;
  compiled: boolean;
  procedure?: Procedure | null;
  scope?: Scope | null;
  fields: ItemFields;
  is_tutorial: boolean;
  deleted_at?: string | null;
  // ISO timestamps. start/end carry an event's span or a task's planned start;
  // deadline is a task's due date/time. all_day marks a date-only span.
  start_at?: string | null;
  end_at?: string | null;
  deadline?: string | null;
  all_day: boolean;
  // 'local' = user-authored; 'gcal' = mirrored Google Calendar event (is_event).
  source: string;
  created_at: string;
  updated_at: string;
  is_parent: boolean;
  is_event: boolean;
  children: Item[];
  latest_checkpoint?: Checkpoint | null;
}

export interface User {
  id: string;
  email: string;
  name?: string | null;
  picture?: string | null;
  last_seen_version?: string | null;
  created_at: string;
  has_password: boolean;
}

export interface Domain {
  id: string | null;
  name: string;
  count: number;
}

export interface PhaseInput {
  id?: string;
  title: string;
  firstAction: string;
}

export interface CompilePayload {
  title?: string;
  mode?: string | null;
  description?: string;
  firstAction?: string;
  risk?: string;
  procedure?: Procedure | null;
  scope?: Scope | null;
  phases?: PhaseInput[];
  start_at?: string | null;
  end_at?: string | null;
  deadline?: string | null;
  all_day?: boolean;
}

export interface ItemUpdatePayload {
  title?: string;
  domain?: string;
  state?: ItemState;
  daily?: boolean;
  start_at?: string | null;
  end_at?: string | null;
  deadline?: string | null;
  all_day?: boolean;
}

export interface CheckpointPayload {
  outcome: Outcome;
  last_state: string;
  what_changed?: string;
  problems?: string;
  // Required unless outcome is "done" — finished work has no next step.
  next_action?: string;
  resume_from?: string;
  do_not_redo?: string;
}
