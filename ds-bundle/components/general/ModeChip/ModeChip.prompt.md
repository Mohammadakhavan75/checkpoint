ModeChip from @checkpoint/ds. Use via `window.CheckpointDS.ModeChip` (bundle loaded from the root `_ds_bundle.js`).

Quiet metadata tag for the session mode (Do / Scout / Plan). Wraps `.mode-chip`.

## Props

```ts
interface ModeChipProps {
  /** Session mode: "Do", "Scout", "Plan" — or any custom label */
  mode: string;
}
```
