import React from "react";

export interface EmptyStateProps {
  /** A short rhetorical question shown in a larger font */
  question?: string;
  /** Secondary hint text below the main content */
  hint?: string;
  /** Optional CTA or input — rendered in the middle of the card */
  children?: React.ReactNode;
}

/** Empty-list placeholder card with optional CTA. Wraps the `.empty` class. */
export function EmptyState({ question, hint, children }: EmptyStateProps) {
  return (
    <div className="empty">
      {question && <div className="empty-q">{question}</div>}
      {children}
      {hint && <div className="empty-hint">{hint}</div>}
    </div>
  );
}
