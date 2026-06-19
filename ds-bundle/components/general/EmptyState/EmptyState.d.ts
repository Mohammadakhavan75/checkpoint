import * as React from 'react';

/**
 * EmptyState — from @checkpoint/ds@1.0.0.
 */
export interface EmptyStateProps {
  /** A short rhetorical question shown in a larger font */
  question?: string;
  /** Secondary hint text below the main content */
  hint?: string;
  /** Optional CTA or input — rendered in the middle of the card */
  children?: React.ReactNode;
}

export declare const EmptyState: React.ComponentType<EmptyStateProps>;
