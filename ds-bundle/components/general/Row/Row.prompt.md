Row from @checkpoint/ds. Use via `window.CheckpointDS.Row` (bundle loaded from the root `_ds_bundle.js`).

Task / item card row. Wraps the `.row` class family.

## Props

```ts
interface RowProps {
  /** Task lifecycle state — applied as a CSS class and drives the resumable glow */
  state?: "idea" | "needsdef" | "active" | "scout" | "blocked" | "waiting" | "deferred" | "done" | "killed";
  /** Shows the green "resumable" glow (task has a checkpoint) */
  resumable?: boolean;
  /** "parent" renders the violet container style; "child" renders the indented phase style */
  variant?: "default" | "parent" | "child";
  /** "next" highlights the child row that should be started next */
  isNext?: boolean;
  /** Row content */
  children: React.ReactNode;
  /** Fade-in animation slot (1–4, cycles through stagger delays) */
  animationSlot?: 1 | 2 | 3 | 4;
}
```
