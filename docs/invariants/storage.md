# Storage Invariants

Update this file for the project.

## Persistence

- Durable writes must either complete fully or fail safely.
- Schema migrations must be backward/forward compatible unless explicitly documented.
- Data loss risk must be identified before merge.

## Migration rules

Storage changes should document:

- migration path;
- rollback path;
- compatibility with old versions;
- operational risk;
- expected failure modes.

## AI-agent rule

Before modifying storage or migration code, the agent must:

1. read this file;
2. document migration impact;
3. include rollback notes;
4. add migration or persistence tests where practical.
