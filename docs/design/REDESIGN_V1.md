# REDESIGN_V1 — Critique-Driven Refinement

**Branch:** `feat/redesign` · **Base:** v0.20.0 (post-PR #38)
**Sources:** live UI critique + UX copy-density audit (2026-07-05/06, full-app tour at 1380px & 375px, WCAG contrast measurements, string inventory of every fixed UI text).

## 0. Decisions (locked with product owner)

| Decision | Choice |
|---|---|
| Depth | Refinement only — **keep** the terminal identity, palette, layout, type families |
| Idea-inbox name | **Reservoir** everywhere; "brain rots" survives as the view subtitle |
| Behavior changes | All four in scope: checkpoint-over-live-session, capture-stays-put, settings modal, read-only event rows |
| Copy | **Full diet** (~60% cut of fixed instructional text), voice kept at decision moments |

## 1. Principles

1. **Keep the voice, fire the narrator.** The warm second-person voice stays at *decision moments* (letter card, empty states, gates). Permanent explanatory prose goes behind a `?` disclosure.
2. **Amber is a budget, not a paint.** ≤1 amber element per row; amber marks *the action the screen wants next* (Start/Go/Capture/Save), never edit/maintenance actions.
3. **One encoding per fact.** State = the chip. Group membership = the group header. Empty fields render nothing — never a labeled "—".
4. **Day-300 default, day-1 on demand.** The UI assumes a returning user; teaching text is reachable, not resident.
5. **A modal must not eat its context.** Anything that opens *from* the session renders *over* the still-live session.

## 2. Word budgets (from the copy audit)

| Surface | Before | Budget |
|---|---|---|
| Chrome (header + sidebar fixed text) | 38 | ≤ 20 (ticker removed) |
| View header (sub + visible lead) | 23–33 | ≤ 12 visible; philosophy behind `?` |
| Per-row fixed text | up to 9 | ≤ 4, zero empty-value labels |
| Compile modal instruction | ~120 rendered | ≤ 70 |
| Checkpoint modal instruction | ~50 | ≤ 30 |

## 3. Workstreams

Implementation order = commit order. Each WS is one reviewable commit.

---

### WS-1 · View headers: `?`-disclosure + copy diet + naming

**New component `web/src/components/ViewHead.tsx`** — unifies the six repeated view headers:

```tsx
<ViewHead title="TODAY" sub="// executable units only" why={PHILOSOPHY} />
```

- Renders `h1` + `.sub` + a small `?` button (class `whybtn`, `aria-expanded`, `aria-label="Why this view"`).
- Clicking toggles the old lead paragraph (`.lead`) below the header. Default hidden, per-view `useState` (not persisted — a returning user who wants the philosophy can always reach it).
- CSS: `.whybtn` styled like `.addbtn` (18px square, faint→amber on hover); ≥44px hit area under `pointer:coarse`.

**Copy table — view headers** (old lead text moves verbatim into `why`):

| View | Title | Sub (after) | Visible lead (after) |
|---|---|---|---|
| Today | TODAY | `// executable units only` | *(none — sub carries it)* |
| Ready | READY TO GO! | `// compiled · waiting` | *(none)* |
| Resumable | RESUMABLE | `// pick up whichever pulls you` | *(none)* |
| Reservoir | **RESERVOIR** | `// where brain rots wait` | *(none)* |
| Domain | {domain} | `// domain backlog` | *(none)* |
| Trash | TRASH | `// deleted · auto-cleared after 30 days` | *(none)* |

**Naming sweep (Reservoir wins):**
- `ReservoirView` h1 `BRAIN ROTS` → `RESERVOIR`; sub → `// where brain rots wait`.
- `Sidebar` nav item `~ Brain Rots` → `~ Reservoir`; section header `RESERVOIR` → `PARKED` (avoids "Reservoir > Reservoir").
- Header capture select keeps `~ Reservoir` (already correct).

**Ticker removal:** delete `.ticker` element from `Header.tsx`, its CSS, the rotation `useEffect`, and the now-unused `RULES` import (constant itself may stay for future use — delete only if lint complains → then delete from `constants.ts` too).
*Why:* always-moving text (WCAG 2.2.2), read ~never, occupies the header's widest slot.

**Reservoir rows:** delete the `parked idea` / `not a daily task` meta line entirely.
**Domain rows:** delete `compiled` / `not compiled` / `ready to go` group echoes; **keep** `on today` (only non-redundant signal). Container rows: also drop the word `container` (▦ marker + progress bar + "n/m phases" already say it).

**Acceptance:** every view renders ≤12 visible words between title and first row; `?` reveals the old paragraph; no "Brain Rots" outside the Reservoir subtitle.

---

### WS-2 · Modal copy diet + empty-value cleanup + Resumable de-lettering

**CompileModal strings:**

| Slot | Before | After |
|---|---|---|
| header note | "Classify the task — that sets its **mode**. A **Time trap** is broken into phases; everything else gets a single first action." | "Classify the task — that sets how you'll run it." |
| first-action placeholder | "the exact first thing to open / run / read / write" | "first thing to open or run" |
| first-action hint | *(keep — high-value gate teaching)* | unchanged |
| phases hint | "Each phase becomes its own startable unit. A phase with a first action goes straight to Ready to GO." | "Each phase becomes its own startable task." |
| risk label | "Risk (likely expansion points)" | "Risk (optional)" |
| risk placeholder | "known unknowns — optional" | "known unknowns" |
| schedule label | "Schedule (optional) — surfaces this task in Today / Ready by date" | "Schedule (optional)" |
| schedule hint | "Due today (or overdue) and starting today pull into Today; the next 7 days show in Ready to GO." | "Due or starting today → Today; next 7 days → Ready to GO." |
| reminder label | "Reminder (optional) — a gentle ping, only if you feel up to it" | "Reminder (optional)" |
| phases field label | "Phases * — a container is worked through its phases, not directly" | "Phases *" (the note moves into the `hint` only if missing) |

**CheckpointModal strings:**

| Slot | Before | After |
|---|---|---|
| note (resume) | "Externalize the state so future-you resumes without rebuilding context. This is mandatory to close." | "Write where you stopped — future-you starts here." |
| note (done) | "Record how it ended so future-you trusts it's finished. This is mandatory to close." | "Record how it ended — this receipt is the proof." |
| placement note | "Session closed and the receipt is written. Move this task into **{dest}** to clear it off Today, or keep it on Today to pick up again soon." | "Receipt saved — where should this task wait?" |

*("mandatory" dropped everywhere: the disabled Save button + gate line already enforce and explain.)*

**UnitRow empty-value cleanup ([UnitRow.tsx](../../web/src/components/UnitRow.tsx)):**
- Exec grid: render the First action / Description cells **only when non-empty**; if both empty, no `.exec` block. (Grid must not render a lone cell at half width — single child spans full width: `grid-column:1/-1` or conditional class.)
- Resume line: `· do not redo: —` renders **only when `do_not_redo` exists**.

**TodayView empty-state hint:** "It becomes a session; closing the session writes the checkpoint your next visit starts from. Or pull a compiled task in from **Ready to GO!**" → "Closing the session writes the checkpoint your next visit starts from."

**ResumableView de-lettering:** pass no `letter`/`userName` props — plain receipt cards (the ⟲ RESUME FROM variant). The letter greeting stays unique to Today.

**Acceptance:** no rendered "—" placeholder values anywhere; Compile modal ≤70 instruction words; exactly one "Dear future…" per app visit.

---

### WS-3 · Amber budget (Domain view)

[DomainView.tsx](../../web/src/views/DomainView.tsx):
- `BacklogRow`: `⚡ Go` becomes `btn amber` (the one-click-start the READY group header promises); `Compile`/`Recompile` becomes plain `btn`.
- `ContainerGroup`: `Edit phases` becomes plain `btn` (it's maintenance, not forward motion).
- CSS `.acts .btn.amber{min-width:92px}` comment updates (Recompile no longer amber; keep width rule only if still needed for Go/Compile alignment — verify visually).

**Acceptance:** each Domain row has exactly one amber button (`Go` on units; none on containers); Ready view (`→ Today`) and Today (`Start/Resume`) unchanged.

---

### WS-4 · Checkpoint over the live session

[App.tsx](../../web/src/App.tsx) currently unmounts `SessionOverlay` when `checkpointOpen` (lines 211–232) — this is the 🔴 finding (notes hidden while writing the receipt; Back remounts → timer/vitals reset, verified live).

**Change:** keep the overlay mounted; stack the modal above it.

```tsx
{sessionId && sessionItem && (
  <SessionOverlay … />        // stays mounted while checkpointOpen
)}
{sessionId && checkpointOpen && (
  <CheckpointModal … />       // renders in a scrim ABOVE the session
)}
```

- CSS: `.session` is `z-index:40`; give the checkpoint scrim `z-index:45` when over a session — add modifier `.scrim.above-session{z-index:45}` and pass a prop/class from `CheckpointModal` (simplest: always render CheckpointModal's scrim with the modifier — it only ever opens over a session).
- Timer semantics: the clock **keeps running** while the receipt is written (writing the receipt *is* session work); no state lift needed since the overlay never unmounts.
- The session's own buttons must not be reachable while the modal is up (scrim covers; focus trap in WS-7 completes it).

**Acceptance:** open checkpoint → session (notes, timer) visibly dimmed behind the form; Back returns with timer/vitals intact (test: note the countdown before/after).

---

### WS-5 · Capture stays put

[App.tsx](../../web/src/App.tsx) `onCapture` currently navigates (`nav("domain", d)` / `setTab("reservoir")`).

- Remove the navigation. `capture.mutate` stays.
- [Header.tsx](../../web/src/components/Header.tsx): show inline confirmation in the capture bar — after successful capture, the `CAP>` label swaps to `✓ →{dest}` (dest = domain name or `Reservoir`) for ~1.6s, then reverts. Implement with `mutateAsync` + a `flash` state; `aria-live="polite"` on the label span so screen readers hear it.
- Sidebar counts already update via React Query invalidation — the count bump is the secondary confirmation.

**Acceptance:** capturing from any view leaves you on that view; the flash announces destination; captured item appears in Reservoir/domain (verify via harness).

---

### WS-6 · Settings modal

**New `web/src/components/SettingsModal.tsx`:** a standard `.scrim > .modal` hosting, in order: `SetPasswordForm` (Google-only accounts), `TwoFactorSettings`, `PushPermissionPanel`, `CalendarConnect`, legal links, delete-account link (opens existing `DeleteAccountModal` above it).
- Move `SetPasswordForm` + `DeleteAccountModal` out of [UserMenu.tsx](../../web/src/components/UserMenu.tsx) into the new file (they're settings concerns).
- Modal gets `role="dialog"`, `aria-modal`, Escape-to-close, sticky footer with Close (mobile full-screen sheet comes free from existing `.modal` responsive CSS).
- **UserMenu popover slims to:** avatar/name/email head · Account + Member-since rows · `⚙ Settings` button (opens the modal, closes the popover) · Log out. Nothing else.

**Acceptance:** popover fits ~360px height; every removed capability reachable via Settings in ≤2 clicks; delete-account still double-gated.

---

### WS-7 · Read-only event rows + a11y pass

**Events ([UnitRow.tsx](../../web/src/components/UnitRow.tsx)):** for `is_event`: no Start/Edit buttons, no state `Chip` (keep the time chip + 🗓 glyph + violet edge). Acts column renders nothing — the `Open in Google Calendar ↗` link in the body is the only action, matching the read-only mirror contract (ADR: calendar is never written).

**a11y (all pre-measured in the critiques):**
1. `CompileModal` + `CheckpointModal`: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` (header `h3` id), Escape handler (Compile: Escape = Cancel; Checkpoint: Escape = Back). New tiny hook `useModalA11y(ref, onClose)` shared by both — also traps Tab within the modal and focuses the first focusable on mount.
2. Input border contrast: new token `--line3:#5a6a82` (measured 3.54:1 on ink, 3.30 on panel, 3.14 on panel2 — `#4b586a` from the first draft only reached 2.69) applied to form-control borders only: `.field input/textarea/select, .addinput, .cap, .empty-cap input, .composer-title, .bridge input, .subrow input, .pomostep`. Leave decorative hairlines (`--line`, `--line2`) untouched.
3. `pointer:coarse` additions: `.rc-dismiss, .linkbtn, .ctxmore, .morebtn, .acct-delete-link, .rmc-trigger, .nudge-optin-btn, .whybtn` → `min-height:44px` (inline-flex + padding).
4. Reduced-motion: extend the existing guard to `.led`, `.ckl .slash` pulse.
5. `--faint` on `--panel2` measured 4.29:1 — where faint text sits on panel2 at <14px (`.cap kbd`, `.rmnd-state`), use `--dim` instead.

**Acceptance:** contrast script passes ≥3:1 for `--line3` on ink and ≥4.5:1 for all small text; Escape closes both modals; Tab cycles inside an open modal.

---

### WS-8 · Verification & wrap-up

1. Rebuild the throwaway fetch-mock harness (see memory notes / previous session): seeded Today/Ready/Resumable/Reservoir/domain/trash + session with snapshots.
2. Screenshot every changed surface at 1380px and 375px; specifically re-verify: timer survives checkpoint round-trip; capture flash; settings modal on mobile; event row affordances; domain amber.
3. Word-count spot check against §2 budgets.
4. Delete harness files. Run `npm --prefix web run build` + lint + tests (`npm --prefix web test` if configured — check package.json scripts).
5. Version bump + changelog entry (`web/src/changelog.ts`) — **confirm version with owner before committing the bump** (release-flow convention; tag only after merge).

## 4. Out of scope (explicitly)

- Type-scale changes, sentence-casing the micro-labels, spacing changes (owner chose refinement-only depth).
- Sidebar state legend (stays).
- "Ready to GO!" name (stays, exclamation and all — identity).
- First-run/tutorial copy (onboarding is where teaching text belongs).
- Landing/legal/auth pages (already lean).
- Backend/API changes — this is a pure `web/` change.

## 5. Risk notes

- **WS-4 z-index:** the session is `z-40`, user-menu panel `z-50`, confirm dialogs `z-40` scrim. New `.above-session` scrim at 45 must stay below confirm dialogs opened from within checkpoint (none exist today) — revisit if one appears.
- **WS-5:** `Header` currently fire-and-forgets `capture.mutate`; switching to `mutateAsync` must not double-submit on Enter (guard with pending state).
- **WS-6:** moving `SetPasswordForm`/`DeleteAccountModal` changes imports only — no logic edits; watch for the `refresh()` auth dependency.
- **WS-2 exec grid:** removing empty cells changes row heights — re-screenshot Today/Ready hover glow (`.row.resumable`) for regressions.
