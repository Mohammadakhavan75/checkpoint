import * as React from 'react';

/**
 * ResumeCard — from @checkpoint/ds@1.0.0.
 */
export interface ResumeCardProps {
  /** Task title */
  title: string;
  /** Checkpoint data to display */
  checkpoint: ResumeCheckpoint;
  /** Called when the "RESUME" button is clicked */
  onResume?: () => void;
  /** Called when the "just exploring" dismiss link is clicked */
  onDismiss?: () => void;
}

export declare const ResumeCard: React.ComponentType<ResumeCardProps>;
