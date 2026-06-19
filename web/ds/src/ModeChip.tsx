import { MODE_HINTS } from "./types";

export interface ModeChipProps {
  /** Session mode: "Do", "Scout", "Plan" — or any custom label */
  mode: string;
}

/** Quiet metadata tag for the session mode (Do / Scout / Plan). Wraps `.mode-chip`. */
export function ModeChip({ mode }: ModeChipProps) {
  if (!mode) return null;
  return (
    <span className="mode-chip" title={MODE_HINTS[mode] ?? `Mode: ${mode}`}>
      {mode}
    </span>
  );
}
