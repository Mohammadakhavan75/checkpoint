# Spec: First-Run Activation & Resume-First Home

| | |
|---|---|
| Status | Draft v2 (seeded-tutorial design folded in) |
| Owner | Mohammad |
| Date | 2026-06-10 |
| Scope | `web/` (primary), `api/` (registration seeding + auth) |

## Problem statement

Checkpoint's core value — *resume meaningful work without rebuilding context* — is only
observable on a **return visit**, after a checkpoint exists. A brand-new user instead meets:
a circular chain of empty states written in private vocabulary (TODAY → "Ready to GO!" →
"compile a backlog task" → BRAIN ROTS), ~7 invented concepts, and zero pixels of the hero
feature (the `⟲ RESUME FROM` line renders only on items that already have checkpoints).

Field evidence (n=1, software engineer): verdict *"I don't get the point"*, followed by a
lockout on the return visit — the exact moment the product proves itself. The user sees
100% of the cost and 0% of the payoff. Both reported failures are one failure: **nobody
survives to the second visit.**

## Goals

1. **Activation:** a new user *experiences a resume* within the first 10 seconds (on seeded
   content) and saves their own first checkpoint within 5 minutes — without reading anything
   or visiting another tab.
2. **Resume-first identity:** a returning user's first screen is *"you were here"* — the
   latest checkpoint receipt with a one-click resume — not a list.
3. **Re-entry never hard-fails:** no path where a legitimate user is permanently locked out.
4. **Preserve the cockpit:** terminal aesthetic and existing ontology stay intact for
   established users; the first-run flow bypasses the ontology, it does not rename it.

## Non-goals

- **Renaming the ontology** (Brain Rots, compile, domains). Depends on an unresolved
  audience decision (friends-only vs. public); not required for activation.
- **Onboarding tours, tooltips, coach marks, sandboxed demos.** The tutorial is seeded app
  state worked through the real loop — no overlay framework, no fake UI, nothing to tear
  down.
- **Analytics/telemetry infrastructure.** Friends-scale; measure by DB queries and asking.
- **Multi-user features** (shared checkpoints, teams).
- **Mobile-specific work** beyond what existing responsive styles give for free.

## User stories

**New user (the friend)**
- As a first-time user, I want my very first screen to be a resume card I can press —
  *"resume from: you just signed up"* — so I feel what the app does before learning any of
  its vocabulary.
- As a first-time user resuming the tutorial item, I want its session to ask me one
  question — what I was actually working on — so the demo hands off to my real work
  immediately.
- As a first-time user, I want my first real session to end with a saved checkpoint and a
  preview of what my return will look like, so the loop closes on my own content.
- As a first-time user who just wants to look around, I want to dismiss the tutorial and
  land in the normal app.

**Returning user**
- As a returning user, I want the app to open with my latest checkpoint receipt and a
  resume button, so I pick up where I stopped instead of scanning a list.
- As a returning user who signed up with Google, I want the password form to tell me that
  ("this account signs in with Google"), so I don't conclude my account is gone.
- As a user who forgot my password, I want a way back in without asking the admin.

**Edge cases**
- Returning user with items but no checkpoints yet → current TODAY list, no resume card.
- User deletes the tutorial item without working it → fall back to a one-question capture
  prompt in the empty TODAY state ("What were you working on before you opened this?").
- User abandons the tutorial session midway → tutorial item stays on TODAY with its seeded
  checkpoint; resume card keeps offering it.
- First-checkpoint reveal fires on the first *user-authored* checkpoint, whenever that
  happens — the seeded tutorial checkpoint never triggers it.

## Requirements

### P0 — cannot ship without

**P0-1 · Resume card** — `web/src/components/ResumeCard.tsx`, rendered above the list in
`TodayView`.
- Source: newest `latest_checkpoint` (by `created_at`) across active items; data already
  present on `ItemOut`, no API change.
- Shows: item title, time since checkpoint, `resume_from`, `next_action`, `do_not_redo`
  (when set), outcome chip. Primary button `⟲ RESUME` → opens `SessionOverlay` for that
  item (reuse `onStart`).
- AC: given ≥1 active item with a checkpoint, opening the app shows the card above the
  TODAY list; clicking resume starts the session in one click; given 0 checkpoints, card
  is absent and current behavior is unchanged.

**P0-2 · Seeded resumable tutorial** — the demo is app state, not an overlay.
- On registration (`POST /auth/register` and first Google sign-in), seed the new account
  with **one** tutorial item — compiled, active, daily — that *already has a checkpoint*
  (pattern exists in `api/app/seed.py`). Seeded receipt, roughly:
  - `last_state`: "You created an account. That's it — that's the whole state."
  - `resume_from`: "right here — this card is how every return to Checkpoint begins"
  - `next_action`: "press ⟲ RESUME"
  - `do_not_redo`: "signing up"
- Net effect: the first screen a new user ever sees is the **resume card (P0-1) pointed at
  seeded content** — they experience a resume in the first ten seconds, before meeting any
  vocabulary.
- **The bridge:** resuming the tutorial opens its `SessionOverlay`; the tutorial item's
  content asks one question — *"What were you working on before you opened this?"* — with
  a capture input inline. Submit → `POST /items/capture` → auto-compile
  `{procedure: known, scope: bounded}` (reuse `fastExecute`) → session on *their* item.
  Proof on seeded content, transfer to real work, no reservoir/domain/compile form in the
  path.
- Completing the bridge marks the tutorial item done (it disappears from TODAY).
- Secondary affordance: dismiss ("just exploring →") deletes/archives the tutorial item
  and lands in the normal app.
- Tutorial items need a marker (e.g. `is_tutorial` flag or reserved domain) so P0-3 can
  exclude the seeded checkpoint and the UI can style/dismiss it — see open questions.
- AC: fresh account → resume card visible with zero clicks; resume → tutorial session →
  one capture → session on own item, zero tab navigation; dismiss lands in current UI;
  deleting the tutorial item leaves no broken state (fallback per edge cases).

**P0-3 · First-checkpoint reveal** — after the user's first *user-authored* checkpoint
saves (seeded tutorial checkpoint excluded), do not silently close. Render their receipt
styled as the resume card (reuse P0-1 component) with copy: *"This is what greets you when
you come back. Nothing to reconstruct."* One acknowledge button. Shows exactly once,
regardless of whether it came via the tutorial bridge or organic use.
- AC: fires on first user-authored checkpoint only; never for the seeded checkpoint;
  second checkpoint closes as today.

**P0-4 · Trimmed first-run checkpoint form** — when closing the session that came from the
tutorial bridge, `CheckpointModal` shows only the three required fields (last state · next
action · resume from); optional fields behind a "more" disclosure. Full form unchanged
elsewhere.
- Rationale: a 7-field modal at minute four is a drop-off cliff at the exact aha moment.

**P0-5 · Re-entry minimum** — login error parity with the register fix already shipped:
password login against a Google-linked account returns *"this account signs in with
Google"* (not "incorrect email or password"). Email lookup case-insensitive on login.
- AC: Google-linked account + password attempt → explicit message; mixed-case email logs in.

### P1 — fast follow

- **Password reset or magic-link login.** Magic link preferred (kills forgot-password AND
  which-method-did-I-use in one move) but requires an email provider — see open questions.
- **Empty states that act:** each empty state embeds its action (inline capture input in
  BRAIN ROTS, etc.) instead of pointing at another tab.
- **Copy diet:** delete the per-view `lead` manifesto paragraphs (TODAY, Ready, Brain
  Rots; compress Domain's to its instruction) and redundant modal notes (e.g. "mandatory
  to close" — the disabled button already enforces it). Philosophy relocates into the
  seeded tutorial item's content (P0-2), read once at the right moment. `// subtitle`
  flavor lines and empty states stay — the only standing text is either aesthetic (one
  line) or contextual guidance that disappears when not needed.
  - Deletion test for any string: *if removed, does a returning user behave differently?*
    No → cut.
- **Auth-screen positioning line:** replace "// sign in to resume" subtitle with the
  one-sentence pitch (no "task", no "manager").
- **Suppress `WhatsNew` modal** for accounts younger than the changelog entries.

### P2 — future / architectural insurance

- Read-only demo tour from the auth screen (seeded demo user exists in `seed.py`).
- Ontology rename pass — only if the audience decision goes beyond friends.
- Activation telemetry — only if distribution goes beyond friends.

## Success metrics

Friends-scale; measured manually (DB query + asking), no instrumentation.

| Metric | Type | Target |
|---|---|---|
| New users pressing ⟲ RESUME on the tutorial card | leading (first contact) | 3 of next 3 invitees, within 30s |
| New users saving ≥1 user-authored checkpoint in first session | leading (activation) | ≥2 of next 3 invitees |
| Time from register → first user-authored checkpoint | leading | ≤5 min |
| Returning users clicking `⟲ RESUME` within 30s of open | leading | observed in ≥1 friend without prompting |
| "I don't get the point" reaction | lagging, qualitative | not heard again |
| Lockout reports | lagging | zero |

Evaluate after the next 3 invites, not on a calendar.

## Open questions

| Question | Who | Blocking? |
|---|---|---|
| How to mark tutorial items: `is_tutorial` column vs. reserved domain vs. title convention. Affects P0-3 gating and dismiss UX | engineering (Mohammad) | blocks P0-2/P0-3 build |
| Magic-link login vs. password reset — and which email provider (Resend? SMTP?) | Mohammad | blocks P1 auth item only |
| Audience: friends-only forever, or eventual public? Decides P2 rename/positioning depth | Mohammad | no |
| Does seeded content cheapen the receipt ("it's fake, so what")? Watch friend #2's reaction to the tutorial card | live test | no |
| Tutorial/bridge copy — seeded receipt wording and the one-question prompt | live test | no |
| Should the tutorial be re-enterable after dismissal (e.g. user menu → "restart intro")? | Mohammad | no |

## Phasing

1. **Phase 1 (smallest diff, ships alone):** P0-1 resume card + P0-5 login error parity.
   Changes what the product *is* on open; Mohammad benefits immediately.
2. **Phase 2:** P0-2 seeded tutorial + bridge, P0-4 trimmed form, P0-3 reveal. Decide the
   tutorial-marker question first (blocks build). Then invite friend #2 with the new
   one-liner pitch (positioning test rides along free).
3. **Phase 3:** P1 items, led by magic-link/reset once the email-provider question is
   settled.

Dependencies: none external. Phase 2 depends on Phase 1's `ResumeCard` component twice
over: the tutorial's first screen *is* the resume card on seeded data, and the P0-3 reveal
reuses it.
