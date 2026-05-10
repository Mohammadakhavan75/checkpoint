# Coding Guidelines

Customize this file for the project.

## General rules

- Prefer minimal, targeted changes.
- Do not combine unrelated refactors with feature or bugfix work.
- Preserve existing public behavior unless the task explicitly requires a change.
- Prefer explicit names over clever abstractions.
- Keep error handling fail-safe and observable.

## Code comments

Use comments for non-obvious local constraints, not for restating code.

Good:

```text
This operation must be atomic because a crash between delete and insert can corrupt session state.
```

Bad:

```text
Increment i by one.
```

## Dependency rules

Document dependency direction here.

Example:

```text
API layer may depend on domain layer.
Domain layer must not depend on API layer.
Storage layer must not call presentation/UI code.
```

## AI-specific rules

- If behavior changes, update the relevant context summary.
- If an invariant changes, update the invariant document and add an ADR.
- If the agent is uncertain, it must record the uncertainty in the task log.
