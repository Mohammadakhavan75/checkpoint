# Design Sync Notes

## Re-sync risks and gotchas

### Playwright version pin
The cached Chromium in `~/Library/Caches/ms-playwright/` is rev 1217. Only `playwright@1.59.0` pins that exact rev. If `playwright` is upgraded or reinstalled, the new version will try to download a different rev and will likely fail on a slow/restricted network. To fix: `npm install playwright@1.59.0` in `ds-bundle/` (or wherever the converter staged it).

### CSS is copied into the DS package
`app.css` lives at `web/src/styles/app.css`. The build step (`web/ds/build.mjs`) copies it into `web/ds/app.css` before esbuild runs. If the app CSS is renamed or moved, update `build.mjs`'s `copyFileSync` source path.

### `cssEntry` must be inside `web/ds/`
The converter's `cfgPath()` bounds `cssEntry` to the package root. The config says `"cssEntry": "app.css"` (relative to `web/ds/`), not the original source path.

### Fixed/portal components need `cardMode: "single"`
`Modal` and `ConfirmDialog` use `position:fixed` and escape the preview grid cell. They have `cardMode: "single"` overrides in config. If new components are added that use `position:fixed` or create a stacking context issue, add the same override.

### Wide components need `cardMode: "column"`
`Marker` (AllStates row) and `TabBar` were too wide for the default `cardMode`. They have `cardMode: "column"` overrides in config.

### Fonts are Google Fonts CDN (no local copy)
JetBrains Mono and IBM Plex Sans are loaded via `@import url(https://fonts.googleapis.com/...)` in `app.css`. They are NOT bundled in `fonts/`. The `runtimeFontPrefixes` config suppresses `[FONT_MISSING]` warnings for them. The converter's `fonts/` dir is empty — this is intentional.

### Preview dark backgrounds
Preview stories wrap their content in `<div style={{ background: 'var(--ink)' }}>` because the preview HTML injects `body { background: #fff }` inline, overriding app.css. Any new preview stories must do the same, or components will render on a white background.

### DS package is at `web/ds/`
The `@checkpoint/ds` package is a `private: true` package at `web/ds/`. It has its own `package.json` and `build.mjs`. The build command is `cd web/ds && npm run build`. The source is at `web/ds/src/` with 15 components and barrel export at `web/ds/src/index.ts`.
