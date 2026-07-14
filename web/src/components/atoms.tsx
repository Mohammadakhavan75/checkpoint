import { MODE_HINTS, STATES } from "../constants";
import type { Item, ItemState } from "../types";

export function Chip({ state }: { state: ItemState }) {
  const s = STATES[state];
  return (
    <span className="chip" style={{ color: s.color }}>
      {s.label}
    </span>
  );
}

export function Marker({ state, symbol }: { state: ItemState; symbol?: string }) {
  const s = STATES[state];
  return (
    <span className="marker" style={{ color: s.color }}>
      {symbol ?? s.sym}
    </span>
  );
}

export function ModeChip({ mode }: { mode?: string | null }) {
  if (!mode) return null;
  return (
    <span className="mode-chip" title={MODE_HINTS[mode] ?? `Mode: ${mode}`}>
      {mode}
    </span>
  );
}

export function StateSelect({
  item,
  onChange,
}: {
  item: Item;
  onChange: (state: ItemState) => void;
}) {
  return (
    <select
      className="btn"
      value={item.state}
      onChange={(e) => onChange(e.target.value as ItemState)}
    >
      {(Object.keys(STATES) as ItemState[]).map((k) => (
        <option key={k} value={k}>
          {STATES[k].sym} {STATES[k].label}
        </option>
      ))}
    </select>
  );
}

export function Loading() {
  return <div className="loading">loading…</div>;
}

function fmtWhen(iso: string, allDay = false): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    ...(allDay ? {} : { hour: "numeric", minute: "2-digit" }),
  }).format(d);
}

function fmtClock(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(d);
}

// A small schedule chip for a Today/Ready row: overdue deadlines glow red,
// upcoming deadlines/start-end times stay slate. Deadline wins over start/end.
export function ScheduleChip({ item }: { item: Item }) {
  if (item.deadline) {
    const overdue = item.state !== "done" && new Date(item.deadline).getTime() < Date.now();
    return (
      <span className={`chip due ${overdue ? "overdue" : ""}`}>
        {overdue ? "overdue" : "due"} {fmtWhen(item.deadline)}
      </span>
    );
  }
  if (item.start_at || item.end_at) {
    // Tasks can be scheduled with only an end time (no start) — fall back to
    // end_at as the anchor so that case still renders instead of vanishing.
    const anchor = item.start_at ?? item.end_at!;
    const range = item.start_at && item.end_at ? ` – ${fmtClock(item.end_at)}` : "";
    return (
      <span className="chip due">
        {fmtWhen(anchor, item.all_day)}
        {range}
      </span>
    );
  }
  return null;
}
