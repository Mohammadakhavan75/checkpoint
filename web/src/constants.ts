import type { ItemState } from "./types";

export const STATES: Record<ItemState, { label: string; color: string; sym: string }> = {
  idea: { label: "Idea", color: "var(--faint)", sym: "·" },
  needsdef: { label: "Needs Def", color: "var(--yellow)", sym: "○" },
  scout: { label: "Scout", color: "var(--cyan)", sym: "?" },
  active: { label: "Active", color: "var(--amber)", sym: "▸" },
  waiting: { label: "Waiting", color: "var(--dim)", sym: "…" },
  blocked: { label: "Blocked", color: "var(--red)", sym: "!" },
  deferred: { label: "Deferred", color: "var(--orange)", sym: "→" },
  killed: { label: "Killed", color: "var(--red)", sym: "✕" },
  done: { label: "Done", color: "var(--green)", sym: "✓" },
};

export const STATE_ORDER: ItemState[] = [
  "active",
  "scout",
  "blocked",
  "needsdef",
  "waiting",
  "idea",
  "deferred",
  "done",
  "killed",
];

export const DOMAINS = ["DDWS", "HPC", "Farokhi", "Research", "Teaching", "Personal"];

export interface Block {
  id: string;
  name: string;
  min: number;
  use: string;
}

export const BLOCKS: Block[] = [
  { id: "ignition", name: "Ignition", min: 25, use: "start a hard / vague task" },
  { id: "scout", name: "Scout", min: 40, use: "map an unknown topic" },
  { id: "exec", name: "Execution", min: 75, use: "known technical work" },
  { id: "deep", name: "Deep work", min: 120, use: "architecture · debug · design" },
  { id: "closure", name: "Closure", min: 12, use: "write checkpoint + next action" },
];

export const RULES = [
  "Finish the session cleanly — not the whole task.",
  "No checkpoint location → task is not allowed to start.",
  "Unknown task → scout, do not execute.",
  "Big known task → phase it.",
  "Externalize state before stopping. Don't make future-you rebuild context.",
  "Today's list holds executable units only — never raw ambitions.",
];

// classification quadrant → mode. unknown|unbounded is intentionally unset (TBD).
export const CLASS_MODE: Record<string, string> = {
  "known|bounded": "Do",
  "unknown|bounded": "Scout",
  "known|unbounded": "Plan",
  "unknown|unbounded": "",
};

export const QUAD: Record<string, { n: string; t: string; c: string; d: string }> = {
  "known|bounded": {
    n: "Easy execution",
    t: "EXECUTE NORMALLY",
    c: "var(--green)",
    d: "Procedure known, scope bounded. Just do it.",
  },
  "unknown|bounded": {
    n: "Research spike",
    t: "SCOUT · MAP · DEFINE",
    c: "var(--cyan)",
    d: "You don't know the first valid move. Map it, then define the next task.",
  },
  "known|unbounded": {
    n: "Time trap",
    t: "MAKE SUBTASK",
    c: "var(--orange)",
    d: "You know the steps but it hides variance. Break it into smaller subtasks.",
  },
  "unknown|unbounded": {
    n: "Paralysis trap",
    t: "TO BE DEFINED",
    c: "var(--red)",
    d: "Both unknown and unbounded — how to handle this is still open (TBD).",
  },
};
