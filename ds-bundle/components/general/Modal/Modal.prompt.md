Modal from @checkpoint/ds. Use via `window.CheckpointDS.Modal` (bundle loaded from the root `_ds_bundle.js`).

Full-viewport overlay dialog. Wraps `.scrim` / `.modal`.

## Props

```ts
interface ModalProps {
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
```
