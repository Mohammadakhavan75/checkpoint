# Concurrency Invariants

Update this file for the project.

## General rules

- Shared mutable state must have a clear synchronization strategy.
- Operations that must be atomic must be documented as atomic.
- Retry behavior must be bounded or explicitly justified.
- Timeouts must be explicit for external calls.

## Race-sensitive changes

When changing race-sensitive logic, document:

- the shared resource;
- the competing actors;
- the ordering assumption;
- the failure mode;
- the verification strategy.

## AI-agent rule

Before modifying concurrency-sensitive code, the agent must:

1. identify the shared state;
2. identify possible races;
3. document assumptions in the task log;
4. add a regression test where practical.
