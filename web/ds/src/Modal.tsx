import React from "react";

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

/** Full-viewport overlay dialog. Wraps `.scrim` / `.modal`. */
export function Modal({ title, icon, onClose, children, footer, variant = "default" }: ModalProps) {
  const scrimCls = variant === "confirm" ? "scrim confirm-scrim" : "scrim";
  const modalCls = variant === "confirm" ? "modal confirm-modal" : "modal";
  return (
    <div className={scrimCls}>
      <div className={modalCls}>
        <header>
          {icon && <span className="ic">{icon}</span>}
          <h3>{title}</h3>
          {onClose && (
            <button className="x" onClick={onClose} aria-label="Close">
              ×
            </button>
          )}
        </header>
        <div className="pad">{children}</div>
        {footer && <footer>{footer}</footer>}
      </div>
    </div>
  );
}
