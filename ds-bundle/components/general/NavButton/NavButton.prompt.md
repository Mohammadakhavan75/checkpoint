NavButton from @checkpoint/ds. Use via `window.CheckpointDS.NavButton` (bundle loaded from the root `_ds_bundle.js`).

Sidebar navigation button. Wraps the `.navbtn` class.

## Props

```ts
interface NavButtonProps {
  /** Renders the active (selected) state */
  active?: boolean;
  /** Badge count shown on the right — omit to hide the badge */
  count?: number;
  /** Button content (icon + label) */
  children: React.ReactNode;
  /** Click handler */
  onClick?: () => void;
}
```
