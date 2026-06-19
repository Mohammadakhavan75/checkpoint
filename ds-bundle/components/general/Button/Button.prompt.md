Button from @checkpoint/ds. Use via `window.CheckpointDS.Button` (bundle loaded from the root `_ds_bundle.js`).

Primary action surface. Uses the `.btn` class family with an optional variant.

## Props

```ts
interface ButtonProps {
  /** Visual variant */
  variant?: "default" | "amber" | "ghost" | "danger";
  className?: string;
  id?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}
```
