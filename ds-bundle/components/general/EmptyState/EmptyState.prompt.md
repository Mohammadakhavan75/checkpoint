EmptyState from @checkpoint/ds. Use via `window.CheckpointDS.EmptyState` (bundle loaded from the root `_ds_bundle.js`).

Empty-list placeholder card with optional CTA. Wraps the `.empty` class.

## Props

```ts
interface EmptyStateProps {
  /** A short rhetorical question shown in a larger font */
  question?: string;
  /** Secondary hint text below the main content */
  hint?: string;
  /** Optional CTA or input — rendered in the middle of the card */
  children?: React.ReactNode;
}
```
