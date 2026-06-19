import * as React from 'react';

/**
 * NavButton — from @checkpoint/ds@1.0.0.
 */
export interface NavButtonProps {
  /** Renders the active (selected) state */
  active?: boolean;
  /** Badge count shown on the right — omit to hide the badge */
  count?: number;
  /** Button content (icon + label) */
  children: React.ReactNode;
  /** Click handler */
  onClick?: () => void;
}

export declare const NavButton: React.ComponentType<NavButtonProps>;
