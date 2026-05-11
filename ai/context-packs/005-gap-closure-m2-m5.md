# Context Pack: 005 Gap Closure M2-M5

## Task
Complete the remaining milestones from `docs/plans/gap-closure-plan.md` step by step after M1:
- M2: mission creation captures optional stateful fields.
- M4: primary/secondary active tier with hard active-set cap.
- M3: domains in the UI and domain deletion safety.
- M5: Life Index becomes the boot screen/life configuration view.

## Subsystems affected
- Web: shared mission creation form, Life Index restructuring, domain UI, active tier UI, API client additions, tests.
- Checkpoint service: active-set rank enforcement, promote/demote endpoints, domain deletion safety, tests.
- API gateway: proxy additions/removal of caller-configured active limit, public route compatibility.
- Docs/AI memory: task plan, change records, subsystem summaries, ADR for active cap.

## Context read
- `ai/context/repo-map.md`
- `docs/plans/gap-closure-plan.md`
- `ai/context/subsystem-web.md`
- `ai/context/subsystem-checkpoint.md`
- `ai/context/subsystem-api-gateway.md`
- `ai/context/testing-guidelines.md`
- `ai/context/coding-guidelines.md`
- `docs/invariants/api-compatibility.md`
- `docs/invariants/security.md`
- `docs/invariants/storage.md`
- `docs/invariants/concurrency.md`

## Implementation plan
1. Implement M2 shared `MissionCreateForm`, wire Today/Life Index, add component tests, then run frontend tests/build.
2. Implement M4 backend active rank rules plus promote/demote, gateway proxies, frontend tier UI, tests, ADR, then run backend and frontend verification.
3. Implement M3 domain delete endpoint/proxy, domain management in Settings, domain picker/grouping, tests, then run backend and frontend verification.
4. Implement M5 Life Index read-mostly boot-screen composition with modal create action, tests, then run frontend verification.
5. Run final backend/frontend/build/docker-compose config checks where available and update AI change records.

## Relevant tests identified before edits
- Frontend: `MissionCreateForm.test.tsx`, `LifeIndexPage.test.tsx`, `SettingsPage` tests where added, full `cd web && npm test -- --run`, `cd web && npm run build`.
- Backend: `services/checkpoint-service/tests/test_checkpoint.py` for active cap, promote/demote, domain delete 409.
- Compose: `docker compose config` after code changes.

## Invariant review
- API compatibility: public route additions are backward-compatible; active-limit query removal is a planned product contract change and documented in ADR.
- Security: all new gateway routes derive user id from cookie auth and checkpoint service verifies `X-User-Id` ownership.
- Storage: no schema changes planned; M4 documents deploy-time active-set tightening as a migration/compatibility note in ADR/change record.
- Concurrency: active-rank updates are not serialized beyond existing MVP DB transactions; race assumptions are documented and tests cover single-request behavior.

## Risks
- Larger cross-cutting work can conflict with existing in-flight branch changes; keep changes minimal and verify after every milestone.
- M4 changes active mission semantics and may surprise users with more than three active missions; document migration/rollback.
- M5 depends on M2/M3/M4 UI primitives, so it should be a composition pass rather than a refactor.

## Rollback plan
Rollback by milestone in reverse order: M5 Life Index composition, M3 domains UI/delete, M4 active-tier API/UI/ADR, M2 create form. No schema rollback is required.
