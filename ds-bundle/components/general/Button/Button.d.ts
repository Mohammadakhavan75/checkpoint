import * as React from 'react';

/**
 * Button — from @checkpoint/ds@1.0.0.
 * @replaces button
 */
export interface ButtonProps {
  /** Visual variant */
  variant?: "default" | "amber" | "ghost" | "danger";
  className?: string;
  id?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export declare const Button: React.ComponentType<ButtonProps>;
