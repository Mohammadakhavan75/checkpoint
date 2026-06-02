# Context Pack: ADHD Reverse Psychology Needs Extraction

## Task ID

`007-adhd-reverse-psychology-needs`

## Goal

Use the ADHD conversation transcript, the ADHD engine evolution plan, and Graphify output to explain why the current Checkpoint app does not feel satisfying to use, and infer what the user actually needs from the product.

## User-visible behavior

No app behavior changes in this task. The output is a product/design analysis document that can guide future implementation.

## Relevant subsystems

- Web
- Checkpoint Domain
- API Gateway
- AI memory and planning docs

## Relevant files

- `docs/card/adhd_conversation_verbatim.md`
- `docs/plans/adhd-engine-evolution-plan.md`
- `graphify-out/graph.json`
- `graphify-out/GRAPH_REPORT.md`
- `web/src/pages/TodayPage.tsx`
- `web/src/pages/StopCheckpointPage.tsx`
- `web/src/components/MissionCreateForm.tsx`
- `services/checkpoint-service/app/schemas.py`

## Relevant symbols

- `TodayPage`
- `StopCheckpointPage`
- `MissionCreateForm`
- `MissionCreate`
- `MissionOut`
- `CheckpointCreate`
- `TodayOut`

## Relevant tests

- `web/src/pages/TodayPage.test.tsx`
- `web/src/pages/MissionSnapshotPage.test.tsx`
- `services/checkpoint-service/tests/test_checkpoint.py`

No runtime test changes are planned because this task is documentation and product analysis only.

## Relevant docs

- `ai/context/repo-map.md`
- `ai/context/subsystem-web.md`
- `ai/context/subsystem-checkpoint.md`
- `docs/invariants/api-compatibility.md`
- `docs/invariants/security.md`
- `docs/invariants/concurrency.md`
- `docs/invariants/storage.md`

## Relevant invariants

- API compatibility: no API changes in this task.
- Security: no auth/security changes in this task.
- Concurrency: no shared mutable state changes in this task.
- Storage: no schema or persistence changes in this task.

## Related ADRs

- None.

## Previous change records

- `ai/changes/AI-2026-05-11-001-gap-m1-mission-snapshot.md`
- `ai/changes/AI-2026-05-11-002-merge-logout-gap-closure.md`
- `ai/changes/AI-2026-05-11-003-service-domains.md`

## Current understanding

The current app successfully preserves mission/checkpoint continuity, but it does not yet provide the activation, reward, state adaptation, or recovery loops described in the ADHD product vision. The user's refusal to use it is probably not confusion about the app. It is useful product signal: the app still asks the user to supply the executive function the system is supposed to externalize.

## Assumptions

- The user's goal is product self-understanding, not medical or clinical advice.
- The analysis should stay grounded in the local repo and docs.
- Any future implementation should be incremental and preserve the existing checkpoint primitive.

## Risks

- Mistaking architectural frustration for user-facing dissatisfaction.
- Over-psychologizing a product-fit problem.
- Building more planning surface instead of testing activation/reward behavior.

## Open questions

- Is the most painful failure mode initial avoidance, return-after-gap, or boring continuation?
- Should the next implementation prove a tiny director/reward loop before the architecture collapse?
- Should the director be rule-based only for the first experiment?

## Initial implementation plan

1. Read repository map, relevant subsystem summaries, invariants, transcript, evolution plan, and graph output.
2. Add a reverse-psychology needs document under `docs/plans/`.
3. Add AI change records documenting this analysis-only change.
4. Verify the new files exist and contain the expected headings.

## Verification plan

- Confirm the new docs and change records exist.
- Confirm no runtime source files were edited by this task.
