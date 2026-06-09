# Task Context Pack: Logout Button Position

## Task ID
`TASK-003-logout-position`

## Description
Adjust the layout of the top navigation bar (`AppShell.tsx`) to match the provided screenshot. The logout button, account avatar, and theme toggle should be correctly positioned and styled.

## Subsystems
- **Web**: `web/src/components/AppShell.tsx`, `web/src/styles/app.css`.

## Invariants
- Navigation should remain responsive.
- Theme toggle and logout functionality must be preserved.

## Implementation Plan
1.  **Modify `web/src/components/AppShell.tsx`**:
    *   Remove `account-name` from `account-chip` to show only the avatar, as seen in the screenshot.
    *   Ensure the order of elements in `.top-meta` is: `Active limit`, `info-dot`, theme toggle, `account-chip` (avatar), and logout button.
2.  **Modify `web/src/styles/app.css`**:
    *   Remove `padding-right: 200px` from `.top-meta` to allow it to align correctly to the right.
    *   Remove the media query that hides `.account-chip` below 1250px, or adjust it so the avatar remains visible.
    *   Adjust spacing/gaps in `.top-meta` and `.account-chip` to match the visual spacing in the screenshot.
    *   Ensure `.top-bar` correctly distributes space (it currently has `justify-content: space-between` with a `top-spacer`).

## Verification
- Visual inspection against the provided screenshot.
- Run `npm run test` in `web/` to ensure no component regressions.
