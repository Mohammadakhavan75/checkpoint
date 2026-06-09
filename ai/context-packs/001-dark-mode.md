# Context Pack: 001-dark-mode

## Task
Add dark mode capability using a user-triggered toggle, adhering to industry standards for user experience.

## Subsystems affected
- Web: UI components and styles.

## Context
The project uses standard CSS variables for styling. Currently, only light mode variables are defined in `:root`. Dark mode needs to be added by introducing a `.dark` scope that overrides the color variables. The toggle will be added to the `AppShell` header to be accessible globally.

## Implementation Plan
1. Update `web/src/styles/app.css`:
   - Add `.dark` class to `:root` to redefine CSS variables for dark mode (background, text, surfaces, lines, primary colors).
   - Convert hardcoded colors (like `#fff`, `rgba(255, 255, 255, 0.96)`, `#3f474f`, etc.) into new variables or override them in the `.dark` class to ensure the dark theme covers all elements.
2. Implement a Theme Provider / Hook in `web/src/lib/theme.ts` (or manage in `AppShell`):
   - Respect system preference via `window.matchMedia('(prefers-color-scheme: dark)')`.
   - Persist user preference in `localStorage`.
   - Apply `dark` class to `document.documentElement`.
3. Update `web/src/components/AppShell.tsx`:
   - Import `Moon` and `Sun` icons from `lucide-react`.
   - Introduce a toggle button in the `top-meta` section of the header.
4. Run frontend tests and visually verify.

## Relevant Tests
- `web/src/components/AppShell.test.tsx` (ensure the new button doesn't break rendering)
- No backend tests affected.

## Risks
- Hardcoded colors in CSS might not flip in dark mode. Mitigation: sweep `app.css` for hardcoded colors and replace with semantic CSS variables.
- Rollback plan: Revert changes to `app.css` and `AppShell.tsx`.
