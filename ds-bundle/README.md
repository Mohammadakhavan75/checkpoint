# CheckpointDS (@checkpoint/ds@1.0.0)

This design system is the published @checkpoint/ds React library, bundled as a single
browser global. All 15 components are the real upstream code.

## Where things are

- `_ds_bundle.js` — the whole-DS bundle at the project root; loads every component to `window.CheckpointDS`. First line is a `/* @ds-bundle: … */` metadata header.
- `styles.css` — the single stylesheet entry: it `@import`s the tokens, fonts, and component styles (`_ds_bundle.css`). Link this one file.
- `components/<group>/<Name>/<Name>.prompt.md` (example JSX + variants), `<Name>.d.ts` (types), `<Name>.html` (variant grid).
- `tokens/*.css` — CSS custom properties, names verbatim from upstream.
- `fonts/` — `@font-face` files + `fonts.css` (when the package ships fonts).

For a specific component, `read_file("components/<group>/<Name>/<Name>.prompt.md")`.

## Loading

Add these two lines to your page once (React must be on the page first):

```html
<link rel="stylesheet" href="styles.css">
<script src="_ds_bundle.js"></script>
```

Components are then available at `window.CheckpointDS.*`. Mount into a dedicated child node (e.g. `<div id="ds-root">`), not the host page's own React root, so the two trees don't collide:

```jsx
const { Button } = window.CheckpointDS;
ReactDOM.createRoot(document.getElementById('ds-root')).render(<Button />);
```

## Tokens

18 CSS custom properties from @checkpoint/ds. Names are
preserved verbatim from upstream. They are declared inside `_ds_bundle.css` (this DS ships one compiled stylesheet rather than separate token files).

- **other** (18): `--ink`, `--panel`, `--panel2`, …

## Components

### general
- `Button` — Primary action surface. Uses the .btn class family with an optional variant.
- `Chip` — Status badge with a colored dot indicator. Wraps the .chip class.
- `ConfirmDialog` — Small centered confirmation dialog stacked above the current content.
- `EmptyState` — Empty-list placeholder card with optional CTA. Wraps the .empty class.
- `Field` — Form field wrapper with label and optional hint. Wraps the .field class.
- `Loading` — Full-area loading indicator in monospace dim text.
- `Marker` — Monospace state symbol (, , , ). Used as the leading glyph in row cards.
- `Modal` — Full-viewport overlay dialog. Wraps .scrim / .modal.
- `ModeChip` — Quiet metadata tag for the session mode (Do / Scout / Plan). Wraps .mode-chip.
- `NavButton` — Sidebar navigation button. Wraps the .navbtn class.
- `ProgressBar` — Slim inline progress bar. Wraps .prog / .bar.
- `ResumeCard` — Checkpoint receipt shown at the top of every return visit. Green-glowing card.
- `Row` — Task / item card row. Wraps the .row class family.
- `SnapCard` — Snapshot note card. Wraps the .snapcard class.
- `TabBar` — Horizontal tab navigation bar. Wraps .tabbar / .tab.
