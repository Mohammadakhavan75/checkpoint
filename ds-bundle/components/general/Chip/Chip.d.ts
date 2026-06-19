import * as React from 'react';

/**
 * Chip — from @checkpoint/ds@1.0.0.
 */
export interface ChipProps {
  /** Task lifecycle state — drives label and color automatically */
  state: "idea" | "needsdef" | "active" | "scout" | "blocked" | "waiting" | "deferred" | "done" | "killed";
  /** Override the auto-derived label */
  label?: string;
  /** Override the auto-derived color */
  color?: string;
}

export declare const Chip: React.ComponentType<ChipProps>;
