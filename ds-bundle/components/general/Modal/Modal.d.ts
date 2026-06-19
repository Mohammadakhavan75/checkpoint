import * as React from 'react';

/**
 * Modal — from @checkpoint/ds@1.0.0.
 * @replaces dialog
 */
export interface ModalProps {
  /** Dialog title */
  title: string;
  /** Short monospace icon/symbol shown before the title */
  icon?: string;
  /** Called when the × close button is clicked */
  onClose?: () => void;
  /** Main dialog content */
  children: React.ReactNode;
  /** Footer content — typically action buttons */
  footer?: React.ReactNode;
  /** "confirm" renders a smaller, centered dialog */
  variant?: "default" | "confirm";
}

export declare const Modal: React.ComponentType<ModalProps>;
