import * as React from 'react';

/**
 * SnapCard — from @checkpoint/ds@1.0.0.
 */
export interface SnapCardProps {
  /** Optional title shown in amber above the note content */
  title?: string;
  /** Snapshot body — plain text or rendered markdown HTML */
  children: React.ReactNode;
  /** Called when the edit button is clicked */
  onEdit?: () => void;
  /** Called when the delete button is clicked */
  onDelete?: () => void;
  /** True while the card is being edited */
  editing?: boolean;
}

export declare const SnapCard: React.ComponentType<SnapCardProps>;
