ConfirmDialog from @checkpoint/ds. Use via `window.CheckpointDS.ConfirmDialog` (bundle loaded from the root `_ds_bundle.js`).

Small centered confirmation dialog stacked above the current content.

## Props

```ts
interface ConfirmDialogProps {
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
```
