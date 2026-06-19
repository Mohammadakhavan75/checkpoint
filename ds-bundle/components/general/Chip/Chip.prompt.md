Chip from @checkpoint/ds. Use via `window.CheckpointDS.Chip` (bundle loaded from the root `_ds_bundle.js`).

Status badge with a colored dot indicator. Wraps the `.chip` class.

## Props

```ts
interface ChipProps {
  /** Task lifecycle state — drives label and color automatically */
  state: "idea" | "needsdef" | "active" | "scout" | "blocked" | "waiting" | "deferred" | "done" | "killed";
  /** Override the auto-derived label */
  label?: string;
  /** Override the auto-derived color */
  color?: string;
}
```
