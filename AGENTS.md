# AI Agent Operating Rules

You are working in a large, long-lived production codebase.

Your primary goal is not only to change code, but to preserve codebase understandability over time.

## Mandatory workflow

For every non-trivial task, follow this lifecycle:

1. Read the repository map:
   - `/ai/context/repo-map.md`

2. Create or update a task context pack:
   - `/ai/context-packs/<TASK-ID>-<short-name>.md`

3. Read relevant subsystem summaries:
   - `/ai/context/subsystem-*.md`

4. Read relevant invariants:
   - `/docs/invariants/*.md`

5. Produce an implementation plan before editing code.

6. Identify relevant tests before editing code.

7. Make the minimal safe change.

8. Add or update tests.

9. Run relevant verification commands.

10. Create or update an AI change record:
   - `/ai/changes/<CHANGE-ID>-<short-name>.md`
   - `/ai/changes/<CHANGE-ID>-<short-name>.yaml`

11. Update affected subsystem/file summaries if behavior changed.

12. Prepare a PR summary including:
   - problem
   - context
   - files changed
   - tests
   - risks
   - rollback plan
   - AI change record link

## Forbidden behavior

Do not:
- edit code before reading relevant context;
- make broad refactors without explicit justification;
- change public APIs without an ADR;
- change security-sensitive code without reading security invariants;
- claim tests passed unless commands were actually run;
- leave TODOs without tracking them in the task log;
- delete existing behavior without documenting compatibility impact.

## Required artifacts for behavioral changes

A behavioral change must include:

- task context pack
- test update or explicit test justification
- AI change record
- rollback plan
- risk section

## Required artifacts for architectural changes

An architectural change must include:

- ADR
- migration/compatibility note
- updated architecture summary
- affected invariant review