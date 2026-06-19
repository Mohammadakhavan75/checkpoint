Marker from @checkpoint/ds. Use via `window.CheckpointDS.Marker` (bundle loaded from the root `_ds_bundle.js`).

Monospace state symbol (▸, ✓, !, …). Used as the leading glyph in row cards.

## Props

```ts
interface MarkerProps {
  /** Task lifecycle state — drives symbol and color automatically */
  state: "idea" | "needsdef" | "active" | "scout" | "blocked" | "waiting" | "deferred" | "done" | "killed";
  /** Override the auto-derived symbol (e.g. "▦" for a container) */
  symbol?: string;
  /** Override the auto-derived color */
  color?: string;
}
```
