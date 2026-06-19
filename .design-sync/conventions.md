# Checkpoint DS — Design Conventions

## Dark-first theme

Every surface uses a dark background. The two main background tokens are:
- `var(--ink)` — deepest background (app shell, sidebars)
- `var(--panel)` / `var(--panel2)` — cards and overlays (lighter dark layers)

Do not place components on a white or light background; all colors, borders, and text contrast are calibrated for dark surfaces only.

## Color semantics

| Token / class | Meaning |
|---|---|
| Amber / `--amber` | Primary action, active state, selected tab underline |
| Green / `--green` | Done / success (DONE chip, ResumeCard border glow) |
| Red / `--red` | Blocked / killed / danger |
| Violet / `--violet` | Decorative / progress fill (ProgressBar) |
| Dim text | Inactive items, metadata, ghost buttons |

State colors are hard-coded per `ItemState` in `STATE_CONFIG` — use `Chip` or `Marker` to render them rather than re-inventing the color logic.

## Typography

Two fonts are loaded from Google Fonts:
- **IBM Plex Sans** — all prose, labels, metadata (the default `font-family`)
- **JetBrains Mono** — monospace code, markers, timestamps, loading state

Markers (▸, ✓, !, …) are rendered in JetBrains Mono at a small size. Do not substitute emoji or icon fonts for them.

## Component grammar

- **Row** is the primary list item; every task renders as one.
- **Chip** / **Marker** are always paired with a `state` prop — never use them without one.
- **Modal** / **ConfirmDialog** use `position:fixed` and must be portal-mounted at the document root, not inside a grid cell.
- **ResumeCard** is always rendered at the very top of a session view, never mid-list.
- **NavButton** groups are always preceded by a `.navheader` section label (uppercase, dim).
- **TabBar** tabs should reflect view names that already exist in the app (`Today`, `Ready to Go`, `Reservoir`, `Trash`).

## Spacing and borders

All components use `border-radius: var(--r)` (8px) as the card radius and `border-radius: var(--r2)` (4px) for inline chips. Do not introduce arbitrary border-radius values.

Borders use `var(--border)` color — a dim translucent line. Active / selected state adds `var(--amber)` as an underline (TabBar) or left-border accent (NavButton).

## What not to do

- Do not add shadows (`box-shadow`) — the design uses border + background contrast instead.
- Do not use `!important` overrides — all specificity is class-level.
- Do not mix Tailwind or utility classes — all styles come from `app.css` class names.
- Do not set `color: #fff` or `background: #000` directly — always use the CSS custom property tokens.
