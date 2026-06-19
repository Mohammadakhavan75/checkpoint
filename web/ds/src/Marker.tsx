import { STATE_CONFIG, type ItemState } from "./types";

export interface MarkerProps {
  /** Task lifecycle state — drives symbol and color automatically */
  state: ItemState;
  /** Override the auto-derived symbol (e.g. "▦" for a container) */
  symbol?: string;
  /** Override the auto-derived color */
  color?: string;
}

/** Monospace state symbol (▸, ✓, !, …). Used as the leading glyph in row cards. */
export function Marker({ state, symbol, color }: MarkerProps) {
  const s = STATE_CONFIG[state];
  return (
    <span className="marker" style={{ color: color ?? s.color }}>
      {symbol ?? s.sym}
    </span>
  );
}
