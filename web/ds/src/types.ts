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

export const STATE_CONFIG: Record<ItemState, { label: string; color: string; sym: string }> = {
  idea: { label: "Idea", color: "var(--faint)", sym: "·" },
  needsdef: { label: "Needs Def", color: "var(--yellow)", sym: "○" },
  scout: { label: "Scout", color: "var(--cyan)", sym: "?" },
  active: { label: "Active", color: "var(--amber)", sym: "▸" },
  waiting: { label: "Waiting", color: "var(--dim)", sym: "…" },
  blocked: { label: "Blocked", color: "var(--red)", sym: "!" },
  deferred: { label: "Deferred", color: "var(--slate)", sym: "→" },
  killed: { label: "Killed", color: "var(--red)", sym: "✕" },
  done: { label: "Done", color: "var(--green)", sym: "✓" },
};

export const MODE_HINTS: Record<string, string> = {
  Do: "Known, bounded — execute a clear plan",
  Scout: "Unknown — explore and map before committing",
  Plan: "Known, unbounded — break into phases before executing",
};

export interface ResumeCheckpoint {
  outcome: string;
  last_state: string;
  resume_from?: string | null;
  next_action?: string | null;
  do_not_redo?: string | null;
  created_at: string;
}
