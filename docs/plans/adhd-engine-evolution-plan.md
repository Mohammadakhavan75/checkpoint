# Checkpoint → ADHD Adaptive Momentum System

## Needs extraction, target structure, and incremental implementation plan

Status: Planning (no implementation yet)
Date: 2026-06-03
Inputs: `adhd_conversation_verbatim.md` (product vision), current codebase, `graphify-out` code graph

---

## 1. Diagnosis — why you can't do your work today

Two problems are tangled together. One is architectural, one is conceptual. They reinforce each other.

### 1a. The architecture taxes every change (root cause you picked)

For a **single-user personal tool**, the current system is four deployable services (`web`, `api-gateway`, `identity-service`, `checkpoint-service`) plus Postgres plus Redis. The `api-gateway` is almost a pure 1:1 proxy — `passthrough_json(await checkpoint_request(...))` repeated ~20 times. It validates the cookie and forwards. It adds no logic except stitching `preferences` into `/today`.

The practical consequence: **adding one product field touches five layers.**

```
new field  →  checkpoint models.py
           →  checkpoint schemas.py
           →  api-gateway passthrough (duplicate route)
           →  web lib/types.ts
           →  web page/component
```

That is the iteration tax. The engines you actually want (state, momentum, reward, recovery) are each a cluster of new fields, new endpoints, and new derived data. Building them against a five-layer pass-through means every experiment is slow and discouraging — which, for an ADHD-targeted tool you are building *for yourself*, is the exact failure mode the product is supposed to fight. The tool's own architecture has high activation energy.

### 1b. The product is a notebook, not a director

You have built **one of the six engines** from the vision: the **Context Snapshotting Engine**. Missions carry rich resume fields (`current_state`, `next_action`, `do_not_rethink`, `reentry_note`, ...), Checkpoints are save-points, and the Start/Stop ritual restores context. That is the strongest primitive in the doc, and it exists.

But the doc's whole thesis is that snapshotting is the *foundation*, not the *product*. The product is what sits on top: it lowers activation energy, rewards starting and resuming immediately, adapts to your state, and makes re-entry shameless. None of that exists. So the current app is passive — it faithfully remembers where you were, then waits. It never pulls you in, never rewards the hard part (starting), never reacts when you're overwhelmed, never catches you after you drop off. It optimizes for *organization* (the doc's named anti-pattern) instead of *activation*.

So "I can't do my work" = the tool stores state beautifully but does nothing to help you *enter* the work, and changing that is slow because of the architecture.

---

## 2. What you actually need (extracted)

Mapping the vision's six engines + mechanics against what's built:

| # | Capability (from vision) | Status today | The actual need |
|---|---|---|---|
| 4 | **Context Snapshotting** | ✅ Built | Keep it. It's the foundation. |
| 2 | **Mission Engine (micro-missions)** | ⚠️ Partial — "Missions" are heavy projects | Lightweight, startable actions with metadata (activation energy, cognitive load, emotional resistance, novelty, est. minutes, reward type). The ability to break a heavy thing into a 2–8 min next action. |
| 3 | **Momentum Economy** | ❌ Missing | A visible momentum signal that rewards *starting* and *resuming* more than finishing. Append-only, never punitive. |
| 5 | **Adaptive Reward** | ❌ Missing | Immediate, emotionally believable feedback at the moment of initiation/recovery — not badges. |
| 6 | **Recovery Engine** | ❌ Missing | No-shame re-entry: detect drop-off, switch to "recovery mode," offer a 2-minute restart mission, reward the return. |
| 1 | **State Engine** | ❌ Missing | Track cognitive/emotional state and change what the app recommends and shows based on it. |
| — | **Game mechanics** (Fog of War, Boss Battles, Energy gameplay, Hyperfocus Protection) | ❌ Missing | Externalize fear (Boss phases), reveal clarity through action (Fog of War), protect against exploitative hyperfocus (safe-stop checkpoints). |
| — | **AI layer** | ❌ Missing (out of MVP scope per your call) | Later: mission generation, overwhelm detection, context summarization. Design seams now, build later. |

**The single sentence version of the need:**

> Turn the existing save-state notebook into an active director that lowers the cost of *starting*, gives an immediate reward for starting and returning, adapts to my current state, and treats interruption as expected rather than as failure — without making each change cost five layers of edits.

### Non-goals (carried from the vision, worth restating)
- Not a task manager, not streaks-and-guilt, not enterprise PM software.
- No manipulative dopamine extraction or addictive engagement loops.
- Not multi-user, not multiplayer, not AI-first — for now. (Personal tool, AI optional.)

---

## 3. The structure you want (target architecture)

Decision recorded from our scoping: **evolve incrementally, don't rebuild.** So the target is reachable in steps, and Phase 0 removes the architectural tax before any engine work begins.

### 3a. Architecture: collapse to a modular monolith

```
   BEFORE (4 services + Redis)                AFTER (1 backend, modular)
   ┌─────┐                                    ┌─────┐
   │ web │                                    │ web │
   └──┬──┘                                    └──┬──┘
      │                                          │  /api
   ┌──▼────────┐                              ┌──▼──────────────────────┐
   │ api-gateway│  (1:1 proxy)                │   backend (FastAPI)      │
   └──┬─────────┘                             │  ┌────────────────────┐  │
      │ httpx                                 │  │ identity   module  │  │
   ┌──▼──────────┐  ┌───────────────┐         │  │ checkpoint module  │  │
   │ identity-svc │  │ checkpoint-svc│         │  │ missions   module  │  │
   └──┬───────────┘  └──────┬────────┘        │  │ state      module  │  │
      │                     │                 │  │ momentum   module  │  │
   ┌──▼──────┐  ┌─────┐  ┌──▼──────┐          │  │ recovery   module  │  │
   │ postgres│  │redis│  │ postgres│          │  │ director   module  │  │
   └─────────┘  └─────┘  └─────────┘          │  └────────────────────┘  │
                                              └──────────┬───────────────┘
                                                     ┌───▼────┐
                                                     │ sqlite │ (or postgres)
                                                     └────────┘
```

Why this is the right move for a personal tool:
- Kills the pass-through layer — features now touch **two** layers (backend module + web), not five.
- One process to run; `docker compose up` optional, `uvicorn` enough for daily use.
- Redis goes away (refresh sessions can live in the DB or a signed cookie for one user).
- SQLite is plenty for one user; keep a Postgres option behind config if you ever want it.
- **You keep all the real logic** — identity, checkpoint domain, Today composition, active-set cap — they just become packages instead of network services. This is the "reuse parts" promise of incremental evolution.

The public `/api` contract stays identical, so the web app barely changes in Phase 0. Module boundaries (the `import`-level seams) preserve the option to re-split a service later if you ever go multi-user — you lose nothing structurally, you only remove network overhead.

### 3b. Data model evolution

Keep `Domain`, `Mission`, `Checkpoint`, `ParkingItem`. Evolve and add:

**Mission — add micro-mission metadata + hierarchy (Fog of War / Boss support):**
```
mission_kind      : exploration | momentum | boss | recovery | maintenance | standard
parent_id         : nullable FK → Mission   (Boss → sub-missions; reveals on action)
activation_energy : low | medium | high      (cost to START — the key dimension)
cognitive_load    : low | medium | high
emotional_resistance : low | medium | high
novelty           : low | medium | high
est_minutes       : int
reward_type       : momentum | clarity | resilience | stability | exploration | courage
```
(The heavy "Mission" you have today becomes `mission_kind = boss`; its small startable steps become child missions.)

**New — `StateLog` (State Engine):** append-only `(user_id, state, energy_focus, energy_emotional, novelty_hunger, created_at)`. `state` ∈ the doc's vocabulary (Lost, Overwhelmed, Avoiding, Warming Up, Exploring, Locked In, Hyperfocused, Fatigued, Recovering). "Current state" = latest row.

**New — `RewardEvent` (Momentum Economy + Adaptive Reward):** append-only ledger `(user_id, kind, mission_id?, momentum_delta, clarity_delta, resilience_delta, reason, created_at)`. `kind` ∈ started, resumed, recovered, checkpoint_saved, completed, returned_after_gap. **Append-only and never negative** — this is what structurally guarantees "no shame." The momentum meter and resilience score are *derived* from this ledger, never stored as a mutable counter that can be "lost."

**New — `WorkSession` (Recovery Engine + Hyperfocus Protection):** `(user_id, mission_id, started_at, last_heartbeat_at, ended_at?, end_kind?)`. Drives interruption detection (gap since `last_heartbeat`), recovery-mode triggering, and hyperfocus duration/cooldown prompts.

### 3c. Engine map (backend modules → what they own)

| Module | Owns | Reads |
|---|---|---|
| `identity` | users, prefs, auth | — |
| `checkpoint` | snapshots, resume fields, Today base | missions |
| `missions` | mission CRUD, metadata, Boss/child tree, activation | — |
| `state` | StateLog, current-state read/set | — |
| `momentum` | RewardEvent ledger, derived momentum/resilience | missions, state |
| `recovery` | WorkSession, gap detection, recovery missions | missions, momentum |
| `director` | **the brain**: given state + energy + open missions, decide what Today shows and which mission to recommend | everything |

`director` is the piece that converts the notebook into a teammate. It is **rule-based first** (a deterministic policy table: state → mission filter + reward pacing + UI density), with a clean interface so an AI implementation can replace the rules later without touching callers. This is the "AI optional" seam.

### 3d. Frontend shape
- **Today** becomes director-driven: instead of always rendering the Start Ritual, it asks the director what to show (resume vs. recovery vs. tiny-momentum vs. exploration) based on current state.
- New: a **momentum meter** (derived, calm, non-numeric-shaming), **reward moments** (a quiet "You broke avoidance" beat at initiation), a **state check-in** (one tap), a **recovery-mode** entry, and a **Boss view** (phases + checkpoints + fog that lifts as child missions complete).

---

## 4. Implementation plan (phased, incremental)

Each phase is independently shippable and usable. You can stop after any phase and still have a better tool than today. Recommended order (you had no preference; this is leverage-ordered).

### Phase 0 — Remove the architecture tax *(prerequisite)*
**Goal:** make every future change cheap. Collapse the three FastAPI services + gateway into one modular-monolith backend; keep `/api` identical.
- Create `backend/` with `identity/`, `checkpoint/` packages (move existing code in as modules).
- Replace gateway routes with direct router includes; auth becomes a dependency, not a network hop.
- Drop Redis; move refresh sessions to DB (or signed cookie for single user).
- SQLite by default; Postgres behind an env flag.
- **Done when:** all existing pages work unchanged, all current tests pass against the monolith, `docker-compose` is optional, one `uvicorn` command runs the app.
- **Risk control:** keep the old services in git history; do the move behind the unchanged `/api` contract so the web app is the regression oracle (e2e tests already exist).

### Phase 1 — Micro-Mission Engine + Momentum/Reward *(the core dopamine loop)*
**Why first:** together these create the activation + immediate-feedback loop that is the heart of the vision and is entirely absent today.
- Add mission metadata fields + `mission_kind` + `parent_id`.
- Add `RewardEvent` ledger; emit `started` / `resumed` / `checkpoint_saved` events from existing actions.
- Derive momentum + resilience; expose in `/today`.
- Web: micro-mission picker ("smallest startable action"), momentum meter, reward moment on initiation.
- **Done when:** starting or resuming any mission produces an immediate, visible, believable reward, and a heavy mission can be split into a 2–8 minute next action.

### Phase 2 — Recovery Engine *(no-shame re-entry)*
- Add `WorkSession` + heartbeat; detect gaps.
- "Interruption detected → recovery mode → 2-minute restart mission"; reward `returned_after_gap` with resilience (the doc's "+50 for returning").
- **Done when:** dropping off for days and coming back is met with a tiny restart + a reward, never a broken streak.

### Phase 3 — State Engine + Director *(adaptive behavior)*
- Add `StateLog` + one-tap state check-in.
- Implement `director` policy table: state → recommended mission profile + reward pacing + UI density (e.g., Overwhelmed → one low-load mission, denser rewards, hide everything else).
- Today becomes director-driven.
- **Done when:** the app's recommendation visibly differs when you're Overwhelmed vs. Locked In.

### Phase 4 — Game mechanics
- **Boss Battles + Fog of War**: Boss view with phases/child missions; clarity reveals as children complete.
- **Energy-based gameplay**: missions filtered by reported energy.
- **Hyperfocus Protection**: session-duration cooldown prompts, "safe stopping point" checkpoints.

### Phase 5 — AI layer *(optional, later)*
Swap the `director`'s rule table and a `missions.generate` seam for AI: mission generation from a Boss, overwhelm detection from behavior, context summarization into checkpoints. No caller changes required if the seams from Phase 1/3 hold.

---

## 5. Sharp take (thinking-partner mode)

- **The architecture isn't just "wrong," it's thematically wrong.** A tool whose entire reason to exist is *lowering activation energy* currently has the highest activation energy of anything you own to change. Fixing Phase 0 is dogfooding your own thesis. Do it first; it's the cheapest morale win.
- **Resist rebuilding.** You correctly chose "evolve." The temptation with a vision doc this clean is to start fresh. Don't — the snapshot engine is genuinely the hard, valuable part and it's done. A rebuild would re-litigate solved problems and you'd lose months to auth/CRUD you already have.
- **The riskiest assumption to test cheaply:** that *rewarding initiation* actually changes your behavior. You don't need the whole momentum economy to test it. After Phase 0, the single cheapest experiment is: emit a reward moment on "start," show one momentum number, and use it yourself for two weeks. If the dopamine beat does nothing for you, the entire reward-economy premise needs rethinking before you build Phases 2–4. Test that before investing.
- **Watch the metadata trap.** Seven metadata fields per mission is, ironically, *more* friction to create a mission. For a personal tool, default everything and let yourself set 0–2 fields. If creating a micro-mission isn't a 5-second act, the engine fights its own purpose. (Eventually the AI layer fills these in — which is the real argument for AI later.)
- **One thing the vision under-specifies:** *how state gets set.* A manual one-tap check-in is honest and cheap; behavioral inference is magic but unreliable and is really an AI-layer concern. Start manual. Don't let "detect state automatically" block Phase 3.

---

## 6. Open decisions for you

1. **Phase 0 storage:** SQLite default with Postgres-by-flag (recommended for a personal tool), or stay on Postgres-only? 
2. **Auth for one user:** keep email/password + refresh, or simplify to a single signed long-lived cookie now that there's no Redis?
3. **Engine order:** accept the leverage order (Micro-Mission+Momentum → Recovery → State → Game), or pull Recovery earlier if drop-off-and-return is your most painful personal failure mode?
4. **Where the director's policy lives:** code table (fast, versioned) vs. editable config (tweakable without deploy). I'd start in code.

Tell me which of these you want to lock, and I'll turn the chosen path into a concrete Phase 0 task breakdown (file moves, endpoint-by-endpoint) — still no implementation until you say go.
