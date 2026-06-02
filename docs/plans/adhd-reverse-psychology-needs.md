# ADHD Reverse Psychology Needs Extraction

Status: Analysis
Date: 2026-06-03
Inputs:
- `docs/card/adhd_conversation_verbatim.md`
- `docs/plans/adhd-engine-evolution-plan.md`
- `graphify-out/graph.json`
- `graphify-out/GRAPH_REPORT.md`
- current `TodayPage`, `StopCheckpointPage`, mission form, and checkpoint schema

This is not medical advice or a clinical interpretation. It is a product-fit analysis of the current Checkpoint app against the ADHD-oriented product vision already captured in the repo.

## Working conclusion

The current app will not satisfy you because it is still asking you to behave like the kind of user the vision explicitly says you are not.

It asks you to:
- remember that the app exists;
- choose to open it before activation has started;
- tolerate a calm but emotionally flat screen;
- convert a saved next action into action by yourself;
- press Resume without receiving a meaningful state shift;
- return later and faithfully log a checkpoint;
- keep believing in delayed benefits.

That is a good continuity notebook. It is not yet an activation engine.

The refusal is probably not irrational. It is the system correctly detecting: "This tool will make me perform executive function before it gives me executive function."

## Reverse psychology read

If we wanted to design a version you would avoid, we would make it almost exactly like the current version:

1. Show the important mission.
2. Show the last checkpoint.
3. Show the next physical action.
4. Offer a Resume button.
5. Hide extra context behind disclosure.
6. Ask for a checkpoint after work.

This is clean, useful, and reasonable. That is the problem. Avoidance is not defeated by reasonable information.

The app currently behaves like a calm assistant saying, "Here is where you were. Please continue." But the need in the transcript is closer to, "I cannot cross the threshold alone. Change my state first."

## What the refusal is protecting you from

### 1. Another obligation

The current app has a Stop Ritual, checkpoint fields, mission fields, and a mission index. Even though they are minimal, they still create the emotional possibility of using the app wrong.

The hidden fear is: "Now I have to maintain the system too."

Actual need:
The app should feel useful even when you do not maintain it well. Returning after neglect should be rewarded as recovery, not treated as missing data.

### 2. A confrontation with the real task

Today shows the primary mission and next action. That is good when you are already near readiness. It is bad when you are avoiding, overwhelmed, ashamed, bored, or depleted.

The hidden fear is: "Opening the app will make me face the thing I am avoiding."

Actual need:
The first screen should ask for state before task. If the state is Avoiding or Overwhelmed, the app should not show the full mission as the main event. It should produce a 2-minute entry move.

### 3. Silent non-reward

The current Resume button changes local UI state to "Do the action." There is no believable reward event for the hardest part: crossing from avoidance into motion.

The hidden fear is: "Even if I start, nothing will feel different."

Actual need:
Starting must generate immediate feedback. Not badges. A quiet but explicit reward for the transition: "You broke avoidance. Momentum restored." The reward should attach to initiation, resumption, and return-after-gap more than completion.

### 4. Too much agency at the wrong moment

The app lets you change mission, inspect parked items, show more, edit snapshots, and create missions. These are useful controls, but in a low-agency state they become escape routes.

The hidden fear is: "I will negotiate with the system instead of starting."

Actual need:
The director should temporarily reduce choice. In low state, show one recommended move, one fallback, and one parking escape. The app should be adaptive, not equally permissive all the time.

### 5. The mission is still too big

The current schema has mission-level resume fields, but no first-class micro-mission metadata: activation energy, cognitive load, emotional resistance, novelty, estimate, reward type, recovery kind, or boss/child hierarchy.

The hidden fear is: "The mission title is a whole world, and the next action may still be emotionally too large."

Actual need:
The primitive should shift from "mission with a next_action" to "heavy mission plus disposable micro-mission." The micro-mission should be small enough that completing it is optional; starting it is the win.

### 6. No rescue after disappearance

The transcript treats failure recovery as central. The current app has checkpoint history, but it does not detect a gap, name it softly, or create recovery mode.

The hidden fear is: "If I vanish, coming back will feel like proof that this failed too."

Actual need:
Recovery mode must be a first-class path. After a gap, the app should say, in product behavior not just copy: "Return is progress." It should recommend a restart mission and emit a resilience reward.

## What you actually need

You do not primarily need a better task manager.

You need a state-changing system:

> An app that notices what state you are in, shrinks the world to one survivable action, rewards the transition into action immediately, and makes return-after-failure feel like a successful move.

More concretely:

1. A one-tap state check-in before the mission is shown.
2. A director that chooses the next screen based on that state.
3. A tiny mission generator or selector for 2-8 minute entry moves.
4. A reward ledger for starting, resuming, checkpointing, and returning after gaps.
5. Recovery mode when the app has not seen you for a while.
6. A calm but unmistakable "state changed" moment after pressing Start/Resume.
7. Heavy mission views only when you have enough state to handle them.

## The important correction to the evolution plan

The existing evolution plan is right that the architecture taxes every change. For the builder, Phase 0 matters.

But your current statement is not mainly: "I cannot implement this efficiently."

It is: "I do not want to work with the current app at all."

That means the next proof should probably not be a full architecture collapse. The next proof should be the smallest emotionally real director loop, even if implemented as a thin experiment:

1. Today starts with state: `Avoiding`, `Overwhelmed`, `Warming up`, `Locked in`, `Recovering`.
2. If state is `Avoiding` or `Overwhelmed`, hide the big mission and show one 2-minute action.
3. Pressing Start writes or displays a reward event immediately.
4. If the last checkpoint/session is old, enter recovery mode and reward return.

This does not invalidate Phase 0. It changes the order of confidence. First prove the product can make you want to enter. Then pay down the architecture tax so the engines are cheap to build.

## Fastest falsifiable experiment

Build a temporary "Director Today" path with no ambitious data model:

- Add local/manual state selection.
- Derive a low-friction recommendation from the current mission's `next_action`.
- Add a visible reward moment on Resume.
- Add a return-after-gap message based on last checkpoint age.
- Do not add full gamification, points economy, AI, or boss mechanics yet.

Success criterion:
You open the app while avoiding and feel less need to leave immediately.

Failure criterion:
The reward moment feels fake, or the recommended action still feels like work before safety.

If it fails, the needed product may be less "momentum economy" and more "emotional co-regulation plus task decomposition."

## Product anti-requirements

The app should not:

- require complete mission metadata before being useful;
- ask the user to plan when they are avoiding;
- show the whole life index as a default recovery surface;
- rely on streaks;
- reward only completion;
- punish gaps;
- make the user choose among many important things at startup;
- turn every action into admin.

## PR-ready implication

The next implementation should be framed as:

Problem:
The current Today flow preserves context but does not create activation or recovery.

Context:
The ADHD vision emphasizes activation, immediate feedback, state adaptation, and no-shame recovery. The current code implements checkpoint continuity but not director behavior.

Change:
Add a small director/reward experiment before the larger architecture migration.

Tests:
Add frontend tests for state-specific Today rendering and reward feedback. Add backend tests only if reward events or recovery state become durable.

Risks:
Reward copy may feel artificial. Too much state UI may become another maintenance burden. A thin frontend-only prototype may not be enough to prove durable behavior.

Rollback:
Keep the existing Start Ritual as the fallback Today view behind a feature flag or route-level toggle.
