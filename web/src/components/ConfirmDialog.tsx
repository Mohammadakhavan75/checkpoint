import { useEffect } from "react";

// An in-app replacement for window.confirm() that matches the app's modal
// styling. Renders above whatever modal opened it (higher z-index than .scrim).
// Backdrop click and Escape both cancel — dismissing a confirm is always safe.
export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  danger = true,
  busy = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      className="scrim confirm-scrim"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="modal confirm-modal" role="alertdialog" aria-modal="true">
        <header>
          <span className="ic" style={{ color: danger ? "var(--red)" : "var(--amber)" }}>
            {danger ? "⚠" : "?"}
          </span>
          <h3>{title}</h3>
        </header>
        <div className="pad">
          <p className="confirm-msg">{message}</p>
        </div>
        <footer>
          <button className="btn" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            className={`btn ${danger ? "danger" : "amber"}`}
            onClick={onConfirm}
            disabled={busy}
            autoFocus
          >
            {confirmLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}
