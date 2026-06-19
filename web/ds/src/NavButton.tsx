import React from "react";

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

/** Sidebar navigation button. Wraps the `.navbtn` class. */
export function NavButton({ active, count, children, onClick }: NavButtonProps) {
  return (
    <button className={`navbtn${active ? " on" : ""}`} onClick={onClick}>
      {children}
      {count != null && <span className="cnt">{count}</span>}
    </button>
  );
}
