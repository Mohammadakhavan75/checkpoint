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
