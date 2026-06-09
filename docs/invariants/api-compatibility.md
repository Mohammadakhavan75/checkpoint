# API Compatibility Invariants

Update this file for the project.

## General rules

- Public API changes must be backward compatible unless explicitly approved.
- Breaking changes require an ADR and migration note.
- Error semantics are part of the API contract.
- Field removal is a breaking change.
- Type narrowing can be a breaking change.

## AI-agent rule

Before modifying public API definitions, the agent must:

1. identify consumers;
2. document compatibility impact;
3. add or update API tests;
4. create an ADR for breaking changes.
