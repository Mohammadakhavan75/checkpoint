export type User = {
  id: string;
  email: string;
  created_at: string;
};

export type Preferences = {
  nav_collapsed: boolean;
  active_limit: number;
};

export type Mission = {
  id: string;
  domain_id: string | null;
  title: string;
  status: "active" | "parked" | "completed";
  active_rank: number | null;
  why_matters: string;
  success_condition: string;
  current_state: string;
  last_decision: string;
  blockers: string;
  files_links: string;
  reentry_note: string;
  next_action: string;
  do_not_rethink: string;
  created_at: string;
  updated_at: string;
};

export type Checkpoint = {
  id: string;
  mission_id: string;
  changed: string;
  decision: string;
  where_stopped: string;
  next_action: string;
  do_not_rethink: string;
  created_at: string;
};

export type Domain = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export type ParkingItem = {
  id: string;
  title: string;
  note: string;
  created_at: string;
  updated_at: string;
};

export type DirectorState = "Avoiding" | "Overwhelmed" | "Warming up" | "Locked in" | "Recovering";

export type RewardEvent = {
  id: string;
  user_id: string;
  mission_id: string | null;
  kind: "started" | "resumed" | "returned_after_gap" | "checkpoint_saved" | string;
  message: string;
  created_at: string;
};

export type DirectorPayload = {
  current_state: DirectorState | null;
  recovery_due: boolean;
  entry_move: string;
  fallback_move: string;
  reward_hint: string;
  recommended_mode: "check_in" | "low_state" | "warming_up" | "locked_in" | "recovery" | string;
  latest_reward: RewardEvent | null;
};

export type TodayPayload = {
  primary_mission: Mission | null;
  last_checkpoint: Checkpoint | null;
  active_count: number;
  parking_count: number;
  preferences: Preferences;
  director?: DirectorPayload | null;
};
