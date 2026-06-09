# Context Pack: 006 Merge Fix Logout and Gap Closure

## Task
Merge local/uncommitted work plus `fix/logout-button-position` and `claude/sad-roentgen-31b318` into `master`, resolve conflicts by preserving the more complete file version, then rename `master` to `main`.

## Branches
- `master`: current integration base at `b0861e6`.
- `fix/logout-button-position`: committed logout/avatar positioning fix at `6a71bf2` plus current uncommitted mission snapshot work in the worktree.
- `claude/sad-roentgen-31b318`: gap closure branch at `b58e6fe`.

## Context read
- `ai/context/repo-map.md`
- `ai/context/subsystem-web.md`
- `ai/context/subsystem-api-gateway.md`
- `docs/invariants/security.md`
- `docs/invariants/api-compatibility.md`
- `docs/invariants/storage.md`
- `docs/invariants/concurrency.md`
- Existing context packs for logout positioning and gap closure M2-M5.

## Relevant invariants
- Web route protection and authenticated first route behavior must remain intact.
- Cookie/auth behavior must remain fail closed; no token or secret exposure.
- Public API changes must remain backward compatible unless explicitly documented.
- Storage and active mission behavior changes need rollback/risk notes.
- Active mission state updates are concurrency-sensitive and need test coverage when changed.

## Implementation Plan
1. Inspect current dirty worktree and branch diffs.
2. Preserve current uncommitted changes before branch switching.
3. Move to `master` and merge `fix/logout-button-position`.
4. Merge `claude/sad-roentgen-31b318`, resolving conflicts by comparing branch contents and keeping the more complete implementation.
5. Restore/reconcile preserved uncommitted work where it is ahead of either branch.
6. Update docs/AI change records for the merge.
7. Run relevant verification commands.
8. Rename `master` to `main`.

## Tests identified before edits
- `cd web && npm test -- --run`
- `cd web && npm run build`
- `.venv/bin/python -m pytest services/checkpoint-service/tests`
- `docker compose config`

## Conflict strategy
Prefer the version that preserves both user-visible behavior and tests. For overlapping web files, compare against the logout branch and gap-closure branch; if one file has a broader feature-complete implementation and the other has a small layout fix, integrate the layout fix into the broader implementation rather than dropping either side.

## Risks
- Current uncommitted changes may include work not present on either branch.
- The gap-closure branch touches backend behavior and web state flows, so test failures may expose incomplete branch work.
- Renaming `master` to `main` only changes the local branch unless a remote rename is performed separately.

## Rollback plan
Before merge edits, preserve local work in a stash. If merge resolution fails, abort the merge and re-apply the stash on the original branch. If branch rename is the only issue, rename `main` back to `master`.
