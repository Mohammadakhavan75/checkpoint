import * as React from 'react';

/**
 * ConfirmDialog — from @checkpoint/ds@1.0.0.
 */
export interface ConfirmDialogProps {
  /** The question or warning to confirm */
  message: string;
  /** Called when the user confirms */
  onConfirm: () => void;
  /** Called when the user cancels */
  onCancel: () => void;
  /** Label for the confirm button */
  confirmLabel?: string;
  /** Label for the cancel button */
  cancelLabel?: string;
  /** "danger" renders the confirm button in red */
  variant?: "default" | "danger";
}

export declare const ConfirmDialog: React.ComponentType<ConfirmDialogProps>;
