import * as React from 'react';

/**
 * Marker — from @checkpoint/ds@1.0.0.
 */
export interface MarkerProps {
  /** Task lifecycle state — drives symbol and color automatically */
  state: "idea" | "needsdef" | "active" | "scout" | "blocked" | "waiting" | "deferred" | "done" | "killed";
  /** Override the auto-derived symbol (e.g. "▦" for a container) */
  symbol?: string;
  /** Override the auto-derived color */
  color?: string;
}

export declare const Marker: React.ComponentType<MarkerProps>;
