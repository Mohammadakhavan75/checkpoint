import { STATE_CONFIG, type ItemState } from "./types";

export interface ChipProps {
  /** Task lifecycle state — drives label and color automatically */
  state: ItemState;
  /** Override the auto-derived label */
  label?: string;
  /** Override the auto-derived color */
  color?: string;
}

/** Status badge with a colored dot indicator. Wraps the `.chip` class. */
export function Chip({ state, label, color }: ChipProps) {
  const s = STATE_CONFIG[state];
  return (
    <span className="chip" style={{ color: color ?? s.color }}>
      {label ?? s.label}
    </span>
  );
}
