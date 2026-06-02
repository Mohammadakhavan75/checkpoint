# AI Change Record: ADHD Reverse Psychology Needs Extraction

## Change ID

`AI-2026-06-03-001-adhd-reverse-needs`

## Task ID

`007-adhd-reverse-psychology-needs`

## Summary

Added a product analysis document explaining why the current Checkpoint app does not feel satisfying against the ADHD adaptive momentum vision, and what the user likely needs instead.

## Motivation

The user asked for a reverse-psychology analysis to understand why they do not want to work with the current app and what that refusal implies about actual product needs.

## Behavior before

The repo had an ADHD evolution plan focused on architecture and engine phases, but no focused analysis of the user's immediate refusal to use the current version.

## Behavior after

The repo now includes an analysis artifact that distinguishes builder friction from user-facing activation failure and recommends a small director/reward experiment before or alongside larger architecture work.

## Files changed

- `ai/context-packs/007-adhd-reverse-psychology-needs.md`
- `docs/plans/adhd-reverse-psychology-needs.md`
- `ai/changes/AI-2026-06-03-001-adhd-reverse-needs.md`
- `ai/changes/AI-2026-06-03-001-adhd-reverse-needs.yaml`

## Design decisions

- Kept the change documentation-only to avoid premature product implementation.
- Framed the refusal as product signal rather than user failure.
- Distinguished immediate user satisfaction from architecture migration needs.
- Avoided clinical claims and kept the analysis grounded in local product docs and code shape.

## Alternatives considered

### Implement a director prototype immediately

Rejected because the request asked to understand the need first, and the repo workflow requires context and planning before code changes.

### Only summarize the existing evolution plan

Rejected because the user's question specifically asked why the current version does not feel satisfying, which requires a sharper product-fit analysis than the existing phase plan.

## Invariants reviewed

- `docs/invariants/api-compatibility.md`
- `docs/invariants/security.md`
- `docs/invariants/concurrency.md`
- `docs/invariants/storage.md`

## Invariants preserved

- No public API changes.
- No security-sensitive code changes.
- No shared mutable state changes.
- No storage or migration changes.

## Tests added or updated

None. This is a documentation and product analysis change only.

## Verification commands run

```bash
test -f ai/context-packs/007-adhd-reverse-psychology-needs.md
test -f docs/plans/adhd-reverse-psychology-needs.md
test -f ai/changes/AI-2026-06-03-001-adhd-reverse-needs.md
test -f ai/changes/AI-2026-06-03-001-adhd-reverse-needs.yaml
```

## Verification result

Passed. All expected documentation and AI-memory artifact files exist.

## Rollback plan

Delete the added documentation and change-record files. No runtime state, schema, API, or behavior is affected.

## Known risks

- The analysis may over-index on inferred emotional friction from product docs rather than observed use.
- A frontend-only director experiment may be too thin if durable reward/recovery state is required.

## Follow-up work

- Decide whether the next implementation should prototype the director/reward loop before Phase 0 architecture collapse.
- If implemented, add frontend tests for state-specific Today behavior and reward feedback.
