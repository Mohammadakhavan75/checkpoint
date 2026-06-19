SnapCard from @checkpoint/ds. Use via `window.CheckpointDS.SnapCard` (bundle loaded from the root `_ds_bundle.js`).

Snapshot note card. Wraps the `.snapcard` class.

## Props

```ts
interface SnapCardProps {
  /** Optional title shown in amber above the note content */
  title?: string;
  /** Snapshot body — plain text or rendered markdown HTML */
  children: React.ReactNode;
  /** Called when the edit button is clicked */
  onEdit?: () => void;
  /** Called when the delete button is clicked */
  onDelete?: () => void;
  /** True while the card is being edited */
  editing?: boolean;
}
```
