import React from "react";
import type { ItemState } from "./types";

export interface RowProps {
  /** Task lifecycle state — applied as a CSS class and drives the resumable glow */
  state?: ItemState;
  /** Shows the green "resumable" glow (task has a checkpoint) */
  resumable?: boolean;
  /** "parent" renders the violet container style; "child" renders the indented phase style */
  variant?: "default" | "parent" | "child";
  /** "next" highlights the child row that should be started next */
  isNext?: boolean;
  /** Row content */
  children: React.ReactNode;
  /** Fade-in animation slot (1–4, cycles through stagger delays) */
  animationSlot?: 1 | 2 | 3 | 4;
}

/** Task / item card row. Wraps the `.row` class family. */
export function Row({
  state,
  resumable,
  variant = "default",
  isNext,
  children,
  animationSlot,
}: RowProps) {
  const cls = [
    "row",
    animationSlot ? `fade-in s${animationSlot}` : "",
    variant !== "default" ? variant : "",
    state ?? "",
    resumable ? "resumable" : "",
    isNext ? "next" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return <div className={cls}>{children}</div>;
}
