# Checkpoint — Gap Closure Plan

Implementation plan to close the gaps between the current repo and the *Minimalist Web App Plan: Life Checkpoint System*.

The plan is scoped to **preserve §15 "lighter than the life it manages"** — every gap is closed with the smallest possible UI surface. No new objects, no new routes beyond what is already wired.

---

## Goals

1. Express the **Mission Snapshot** as a first-class screen (Plan §13 Screen 3).
2. Make **checkpoint history** visible and usable for re-entry (Plan §12.4).
3. Bring **Domains** into the product surface, not just the database (Plan §12.2, §13 Screen 2).
4. Enforce and visualize the **1 primary + 2 secondary** active set (Plan §15 Principle 5).
5. Capture **why-matters / do-not-rethink** earlier in the mission lifecycle (Plan §15 Principle 6).

## Non-goals

- No new top-level objects (no tags, no projects, no goals).
- No analytics, streaks, reminders, or notifications.
- No bulk operations, no drag-and-drop reordering polish — keyboard/click only.
- No mobile-specific redesign.

---

## Guiding constraints (from the plan)

Every PR in this plan must be reviewable against these:

- **Re-entry over planning** (§15.3): a change is justified only if it reduces re-entry friction.
- **State over tasks** (§15.2): UI surfaces should make stateful fields more legible, not bury them.
- **Small active set** (§15.5): the system enforces scarcity. It does not invite expansion.
- **Lighter than the life it manages** (§15.7): if a feature creates a new maintenance ritual, it is rejected.

---

## Milestones

The work is broken into five milestones. They are ordered by dependency and by "soul of the product" priority — M1 and M4 are the load-bearing ones; M3 and M5 can ship later.

| # | Milestone | Plan refs | Effort | Risk |
|---|-----------|-----------|--------|------|
| M1 | Mission Snapshot screen + checkpoint history | §13.3, §12.4 | M | low |
| M2 | Mission creation captures stateful fields | §15.6, §17 | S | low |
| M3 | Domains in the UI | §12.2, §13.2 | M | medium |
| M4 | Primary / secondary tier + active-set enforcement | §15.5 | M | medium |
| M5 | Life Index becomes the "boot screen" | §12.1, §13.2 | S | low |

---

## M1 — Mission Snapshot screen + checkpoint history

**Plan source.** §13 Screen 3 ("This is where the user resumes work") and §12.4 (the checkpoint is the product).

**Problem.** `/missions/:missionId` is wired in [App.tsx:41](web/src/App.tsx:41) but routes to `LifeIndexPage` as a stub. The Today "Show more" panel exposes four fields read-only. There is no way to edit `success_condition`, `files_links`, `reentry_note`, or to see prior checkpoints. The backend already supports both (`PATCH /missions/{id}` and `GET /missions/{id}/checkpoints`).

### Scope

Create `web/src/pages/MissionSnapshotPage.tsx` with two regions:

**Region 1 — Snapshot fields (editable in place)**

Each field renders as a `QuietField` in read mode; click toggles to a textarea; blur auto-saves via `PATCH /missions/{id}`. Fields in the plan's order:

- Why this matters
- Success condition
- Current state
- Last decision
- Blockers
- Next physical action
- Files / links
- Re-entry note
- Do not rethink

**Region 2 — Checkpoint history**

Reverse-chronological list of checkpoints for this mission. Each row shows:

- Timestamp (relative: "2 days ago")
- `where_stopped` as the headline
- Collapsed details: `changed`, `decision`, `next_action`, `do_not_rethink`

No edit, no delete on historical checkpoints — checkpoints are immutable by design (Plan §15.6 "decisions should stay decided").

### Backend

No new endpoints needed. Verify:

- `GET /missions/{id}/checkpoints` returns full payload — already present.
- `PATCH /missions/{id}` accepts all snapshot fields — verified in `MissionUpdate` schema.

### Routing

- Replace [App.tsx:41](web/src/App.tsx:41): `<Route path="missions/:missionId" element={<MissionSnapshotPage />} />`.
- Link to it from:
  - TodayPage primary mission title (clickable).
  - LifeIndexPage every mission row (the title becomes a link).

### Tests

- `MissionSnapshotPage.test.tsx`: renders fields, inline edit saves via API, checkpoint history renders in reverse-chrono order.
- E2E: create mission → open snapshot → edit `why_matters` → create checkpoint → reload → see updated field and one history row.

### Acceptance

A user can open any mission, read its full stateful context, edit any field, and scroll a history of decisions without rebuilding context from memory.

---

## M2 — Mission creation captures stateful fields

**Plan source.** §15.2 "state over tasks", §15.6 "decisions should stay decided", §17 ("what should I not rethink").

**Problem.** Both `EmptyToday` ([TodayPage.tsx:149](web/src/pages/TodayPage.tsx:149)) and `LifeIndexPage` create missions with only `title` + `next_action`. The Today empty state hardcodes `do_not_rethink: "Do not optimize the system today."` ([TodayPage.tsx:163](web/src/pages/TodayPage.tsx:163)). The richest state-carrying fields are never captured at the moment the user has the most context — creation.

### Scope

Replace the two-input creation form with a **single-screen, progressive disclosure** form. Two visible fields by default; a "More context (optional)" toggle reveals three more.

**Always visible:**
- Mission title
- Next physical action

**Behind toggle:**
- Why this matters
- Success condition
- Do not rethink

The remaining snapshot fields (blockers, files/links, re-entry note, last decision, current state) are filled later on the Mission Snapshot screen — they are *re-entry* fields, not *creation* fields, and forcing them up front violates §15.7.

### UX detail

- The toggle remembers state per session.
- The placeholder text echoes the plan's voice: `"Open roadmap.md and write the first section"`, not `"Enter next action"`.
- Submit button copy reflects status: "Create active mission" vs. "Park for later".

### Affected files

- [web/src/pages/TodayPage.tsx](web/src/pages/TodayPage.tsx) — `EmptyToday` rewrite.
- [web/src/pages/LifeIndexPage.tsx](web/src/pages/LifeIndexPage.tsx) — create-panel rewrite.
- Extract a shared `MissionCreateForm` component to avoid divergence.

### Tests

- Component test: toggling "More context" reveals three fields.
- Submit with only required fields succeeds.
- Submit with all fields posts a single `POST /missions` call with the full payload.

### Acceptance

A user creating a mission can capture *why* and *what not to rethink* without leaving the creation flow, but is never required to.

---

## M3 — Domains in the UI

**Plan source.** §12.2 (Domain is a top-level object) and §13.2 ("Active domains" is part of the boot screen).

**Problem.** The `Domain` table exists, `domain_id` is on `Mission`, and backend CRUD is implemented (`GET/POST/PATCH /domains`). None of this surfaces in the app. The Life Index shows missions flat — the user's "current life *configuration*" (§12.1) is invisible.

### Scope

Three additions, no new top-level page:

**1. Domain picker on mission create/edit**

- Add a `<select>` field to `MissionCreateForm` (from M2). Options come from `GET /domains`; the first option is "No domain".
- Add inline-edit of `domain_id` on the Mission Snapshot screen.

**2. Domain management lives on Settings**

A new section in [SettingsPage.tsx](web/src/pages/SettingsPage.tsx):

- List existing domains.
- "Add domain" input.
- Inline rename.
- Delete (requires confirmation if any missions reference the domain — backend currently does not block, so this is enforced client-side; see backend gap below).

**3. Life Index groups by domain**

Active region groups missions under domain headers. Domains with zero active missions are not shown. Missions with no domain go under "Unsorted".

### Backend gap

Two small additions:

- `DELETE /domains/{id}` — returns 409 if missions still reference it (force the user to reassign or delete).
- `MissionOut` already returns `domain_id`; add an optional join so the frontend doesn't N+1. Either expose `domain: DomainOut | None` on `MissionOut`, or keep current shape and let frontend join via the cached domain list.

Recommendation: keep `MissionOut` flat. The domain list is small and rarely changes — cache it in `auth.tsx` or a tiny new `domains` context.

### Tests

- Backend: `DELETE /domains/{id}` 409 when in use.
- Frontend: domain picker renders existing domains; Life Index groups under domain headers.
- E2E: create domain → create mission with that domain → see grouping on Life Index.

### Acceptance

A user can see, at a glance on the Life Index, which **areas of life** are currently active — not just which missions.

---

## M4 — Primary / secondary tier + active-set enforcement

**Plan source.** §15.5 ("1 primary mission, 2 secondary missions, everything else parked") — and §10 (the enemy is unbounded open loops).

**Problem.** `active_rank` exists on the model and the backend orders by it, but:

- The frontend never visualizes "this is primary, those are secondary".
- The backend's `active_limit` defaults to `1` ([main.py:120](services/checkpoint-service/app/main.py:120)) — but accepts up to 5 via query param. The plan wants a hard tier of 1 + 2.
- There is no way to swap which active mission is primary.

This is the single most philosophically load-bearing gap. If we don't fix it, users will activate ten missions and recreate the exact overwhelm the product exists to prevent.

### Scope

**Backend changes**

- Introduce two distinct ranks: `PRIMARY = 1`, `SECONDARY = 2 | 3`. Enforce hard cap of 3 active total, of which exactly one (when present) has `active_rank = 1`.
- New endpoint `POST /missions/{id}/promote` — promotes a secondary to primary, demotes the previous primary to secondary.
- New endpoint `POST /missions/{id}/demote` — demotes primary to lowest secondary slot (used when the user wants to "swap focus" without parking).
- Update `activate_mission` to assign the next free secondary rank (2 or 3) by default. If no active mission exists, the new one is primary.
- `TodayOut.primary_mission` is unchanged in shape — `active_rank == 1`.
- Remove the `active_limit` query param. The cap is the product's opinion, not the caller's choice.
- Return `409` with a clear body (`{"detail": "active_set_full", "limit": 3}`) when activation would exceed the cap. The frontend handles this as a prompt to park something first.

**Frontend changes**

- Life Index renames "Active" → splits into two sub-sections: **Primary** (1 row max) and **Secondary** (up to 2 rows). The visual hierarchy makes the tier obvious — primary is larger, secondary is muted.
- Each secondary row gets a "Make primary" action (calls `/promote`).
- The primary row gets a "Swap with…" picker only when ≥1 secondary exists.
- Today reads `primary_mission` unchanged.
- When activation hits 409, show inline copy: *"You already have three active missions. Park one before activating another."* — never silently succeed, never auto-park.

### Migration

Existing active missions: any user with >3 active missions at deploy time keeps the lowest 3 (by `active_rank` then `updated_at`); the rest are parked automatically with a one-line `do_not_rethink` field appended: `"Auto-parked when active set tightened to 3."`. Document this in a migration note.

### Tests

- Backend: cannot activate a 4th mission; promote swaps ranks correctly; demote moves to lowest empty secondary slot.
- Frontend: Life Index renders primary distinctly; "Make primary" swaps in place; 409 path renders inline guidance.
- E2E: activate two missions → second is secondary → promote it → first is now secondary.

### Acceptance

The user cannot accidentally maintain more than three active missions, and can always answer "which one is *the* one?" without ambiguity.

---

## M5 — Life Index becomes the "boot screen"

**Plan source.** §12.1 ("This is the user's boot screen") and §13.2 (Life Index = current life configuration).

**Problem.** Today is the current boot screen; Life Index is a secondary surface. Per the plan, Life Index should be capable of standing alone as a configuration view — domains + tiered missions + parked count.

This milestone is intentionally last because it depends on M3 (domains) and M4 (tiers) already shipping. With those done, M5 is mostly composition.

### Scope

Restructure [LifeIndexPage.tsx](web/src/pages/LifeIndexPage.tsx) to read top-to-bottom as a **life configuration** doc:

1. **Primary** — the one mission (large card, links to its snapshot)
2. **Secondary** — up to two missions, grouped by domain
3. **Domains overview** — small chips: domain name + active mission count
4. **Parking** — count + link to `/parking`

Remove the inline mission-creation form from this page. Creation moves to a single "+ New mission" button that opens a modal using `MissionCreateForm` (M2). The Life Index is read-mostly; creation is an action, not the default state.

### Acceptance

A user landing on Life Index can answer the §12.1 questions — *what is active, primary, secondary, parked, where do I resume* — without scrolling and without an empty form distracting them.

---

## Cross-cutting work

### Empty states

Every empty state should follow the §16 emotional tone — grounding, never shaming. Replace any "You have no X" with "Nothing X yet, and that is fine."

### Accessibility

- All new inline-edit fields must be keyboard-reachable (Enter to edit, Esc to cancel, blur or Ctrl+Enter to save).
- The tier visual hierarchy in M4 must not rely on color alone — use size and label too.

### Testing

- Backend: add tests in `services/checkpoint-service/tests/test_checkpoint.py` for `/promote`, `/demote`, domain delete 409, and the active cap.
- Frontend: new component tests for `MissionSnapshotPage`, `MissionCreateForm`, and the Life Index restructure.
- E2E ([web/e2e/checkpoint.spec.ts](web/e2e/checkpoint.spec.ts)): extend the existing spec to cover M1's checkpoint history loop and M4's promote flow.

### Documentation

- Update [README.md](README.md) "Core Flow" to mention domains and the 1+2 active rule.
- Add an ADR under `docs/adr/` for the active-set cap decision (M4) — the cap is a *product opinion*, and someone will eventually ask why it isn't configurable. The ADR is the answer.

---

## Sequencing recommendation

| Order | Milestone | Why this order |
|-------|-----------|----------------|
| 1 | M1 | Highest re-entry value per unit of work; backend is ready; unblocks the "Mission Snapshot exists" critique. |
| 2 | M2 | Tiny scope; improves data quality for everything downstream. |
| 3 | M4 | The philosophical gap. Ship before M3 because tiering changes how Life Index renders, and M3 layers on top. |
| 4 | M3 | Adds dimension to Life Index; nice but not load-bearing. |
| 5 | M5 | Composition pass. Cheap once M3 + M4 are in. |

A single engineer could ship M1+M2 in one week, M4 in a second week, and M3+M5 together in a third. Two engineers could parallelize M1/M2 against M4 from day one.

---

## What we are deliberately *not* doing

For the reviewer who will ask "but what about…":

- **Tags / labels** — domains already serve the grouping job. Adding tags doubles the categorization burden.
- **Recurring checkpoints / reminders** — Plan §18 explicit exclusion.
- **Checkpoint editing** — checkpoints are immutable by design. If the user got it wrong, they write a new one. (§15.6)
- **Mission archive / completion analytics** — `status: "completed"` exists; surfacing it as a "wins" feed invites the productivity-guilt failure mode of §16.
- **Configurable active-set cap** — the cap *is* the product. Making it configurable hands the user the gun the plan is trying to take away.

---

## Definition of done for the whole plan

A new user can:

1. Sign up.
2. Create three domains.
3. Create one primary mission and two secondary missions, each with a domain.
4. Park a fourth mission and be gently blocked from activating it without parking another.
5. Open the primary mission's snapshot, read all stateful fields, edit them in place.
6. Leave a checkpoint, see it appear in history.
7. Return the next day, land on Today, and resume in under five minutes — the Plan §26 north star.

When (7) is achievable without consulting documentation, the plan is done.
