# Mobile / Tablet Responsiveness — Implementation Plan

Goal: make the Checkpoint web app usable on smartphones and tablets (iPhone / iPad) and in
mobile browsers, without compromising the existing desktop experience.

Status: **plan approved, not yet implemented.**

## Confirmed decisions

| Decision | Choice |
|---|---|
| Mobile navigation | **Drawer only** — hamburger opens a slide-in panel that reuses the existing `<Sidebar>`. |
| Capture box on phones | **Full-width row** beneath the header (core action stays prominent). |
| PWA / installability | **Deferred** — responsive layout + touch ergonomics first; manifest/offline shell later. |

Design by **viewport width, not device**: iPad Split View / Slide Over can render as narrow as
~320–507px, so the phone layout must trigger on width.

## Breakpoints

- **Phone** `< 768px` — drawer nav, single column, full-screen modals, capture row.
- **Tablet** `768–1024px` — keep the sidebar (condensed if needed); the current single 880px
  breakpoint wrongly degrades iPad portrait to the phone layout.
- **Desktop** `> 1024px` — unchanged.

## Current state (baseline)

The entire mobile story today is one media query in `web/src/styles/app.css:349`:

```css
@media(max-width:880px){
  .body{grid-template-columns:1fr} aside{display:none}   /* sidebar deleted, no replacement */
  .cap{min-width:0} .session .stage{grid-template-columns:1fr}
  .exec{grid-template-columns:1fr} .session .clockwrap{...}
}
```

Below 880px the only navigation (the sidebar) is removed with nothing in its place.

## Critical findings driving this plan

1. **No mobile nav** — sidebar is `display:none` < 880px; user is stranded on the active tab.
2. **Header overflows** — brand + ticker + capture + select + ⏎ + avatar in one flex row.
3. **iOS zoom on focus** — every form control is < 16px, so iOS Safari zooms and never restores.
4. **Rows can't fit actions** — `.acts` is `flex:none` beside a `flex:1` title.
5. **Cramped forms** — `.grid2`, phase `.subrow`, 3-col `.matrix`, modal footer don't reflow.
6. **`height:100%` / `100vh`** fights mobile browser chrome (cutoff + broken momentum scroll).
7. **Touch targets too small** — `.addbtn` 18px, `.btn` ~28px, snapshot icons ~22px, modal `×` ~20px.
8. **Hover-only affordances** invisible on touch.
9. **`--faint` (#586470)** small text fails WCAG AA contrast.

## Phased work

### Phase 0 — Foundation
- `web/index.html`: add `viewport-fit=cover` (keep pinch-zoom enabled; never `user-scalable=no`).
- `app.css`: `.app` → `height:100dvh` (fallback `100vh`); add `env(safe-area-inset-*)` padding to
  `header` and any future bottom chrome.
- Global: `input,textarea,select{font-size:16px}` under `@media (pointer:coarse)` (kills iOS zoom).
- `@media (pointer:coarse)` block: `.btn`, `.navbtn`, `.addbtn`, `.caret`, `.x`, `.snapedit`,
  `.snapdel`, selects → ≥ 44×44px hit area.

### Phase 1 — Navigation (drawer)
- New `MobileDrawer` component: backdrop scrim + slide-in panel rendering the existing
  `<Sidebar>`; closes on nav-select, backdrop tap, Esc; locks body scroll while open.
- Hamburger button in `Header` (visible only `< 768px`); drawer state lifted to `App.tsx`
  (or a small `Shell` wrapper).
- Replace `aside{display:none}` with: drawer `< 768px`, persistent inline sidebar `≥ 768px`.

### Phase 2 — Header reflow
- `< 768px`: header = hamburger + brand + spacer + avatar; **hide `.ticker`**.
- Move `.cap` to its own full-width row; input `flex:1`, enlarge domain `<select>` and ⏎.

### Phase 3 — Lists & rows (Today / Ready / Domain)
- `.row`: `flex-wrap` at mobile so `.acts` drops to a full-width second line; drop `flex:none`
  on `.acts`; enlarge buttons.
- Move child-row inline `marginLeft:26` (`DomainView.tsx`) into a class; reduce indent on mobile.
- Confirm `.exec` single-column carries to the new breakpoint.

### Phase 4 — Modals & forms
- `.scrim`/`.modal`: full-screen on phone (`max-width:none`, no side padding) with **sticky
  header + footer** (CompileModal and CheckpointModal are long).
- `.grid2`, `.subrow`, `.matrix` → single column at mobile.
- Footer: allow wrap / full-width stacked buttons.

### Phase 5 — Session overlay
- Reduce `.work` padding; stack `.swrow`; allow top bar to wrap with long titles.
- StackEdit: hide the "Edit in StackEdit" trigger under `pointer:coarse`; if kept, offset its
  fixed Save&Close button by `env(safe-area-inset-top)`.

### Phase 6 — Touch affordances & a11y polish
- Gate `:hover`-reveal styling behind `@media (hover:hover)`; keep edit/delete icons always
  visible on touch.
- Fix `--faint` small-text contrast (lighten token or use `--dim` for body-level meta).
- Add `inputmode` / `enterkeyhint` to the capture input.

### Phase 7 — PWA / installability (deferred, optional)
- `manifest.webmanifest`, app icons + `apple-touch-icon`, `theme-color`,
  `apple-mobile-web-app-*` metas; optional service worker for an offline shell.

## Testing matrix

- **Widths:** 375 (iPhone SE), 393/430 (iPhone 15 / Pro Max), 744/820 (iPad mini / Air portrait),
  1024 (iPad landscape), ~507 & ~320 (iPad Split View).
- **Browsers:** iOS Safari (primary), Chrome on iOS (WebKit), Android Chrome.
- **Scenarios:** input focus (no zoom), drawer open/close + scroll-lock, rotate mid-session,
  long titles, notch / home-indicator clearance, momentum scroll.

## Files most affected

- `web/src/styles/app.css` (bulk of the work)
- `web/index.html` (viewport)
- New: `web/src/components/MobileDrawer.tsx`
- `web/src/components/Header.tsx`, `web/src/App.tsx` (drawer wiring, header reflow)
- Minor: `web/src/views/DomainView.tsx` (inline indent → class)
