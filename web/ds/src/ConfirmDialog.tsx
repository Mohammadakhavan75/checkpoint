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

/** Small centered confirmation dialog stacked above the current content. */
export function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
}: ConfirmDialogProps) {
  return (
    <div className="scrim confirm-scrim">
      <div className="modal confirm-modal">
        <div className="pad">
          <p className="confirm-msg">{message}</p>
        </div>
        <footer
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
            padding: "14px 22px",
            borderTop: "1px solid var(--line)",
          }}
        >
          <button className="btn ghost" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            className={`btn ${variant === "danger" ? "danger" : "amber"}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}
