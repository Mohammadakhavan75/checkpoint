ResumeCard from @checkpoint/ds. Use via `window.CheckpointDS.ResumeCard` (bundle loaded from the root `_ds_bundle.js`).

Checkpoint receipt shown at the top of every return visit. Green-glowing card.

## Props

```ts
interface ResumeCardProps {
  /** Task title */
  title: string;
  /** Checkpoint data to display */
  checkpoint: ResumeCheckpoint;
  /** Called when the "RESUME" button is clicked */
  onResume?: () => void;
  /** Called when the "just exploring" dismiss link is clicked */
  onDismiss?: () => void;
}
```
