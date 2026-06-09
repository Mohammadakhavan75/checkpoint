# Security Invariants

Update this file for the project.

## Fail-safe behavior

When the system cannot prove an action is safe or authorized, it must reject or fail closed.

## Secrets

- Do not log secrets, tokens, private keys, passwords, API keys, or session identifiers.
- Do not expose secrets in errors, telemetry, traces, or generated reports.
- Do not commit real secrets to the repository.

## Authentication and authorization

- Authentication establishes identity.
- Authorization checks whether that identity may perform an action.
- Do not merge these concepts without explicit design justification.
- Authorization checks must happen server-side or in trusted infrastructure.

## Input handling

- Treat external input as untrusted.
- Validate at trust boundaries.
- Prefer allowlists for security-sensitive parsing.

## AI-agent rule

Before modifying security-sensitive code, the agent must:

1. read this file;
2. document reviewed invariants in the context pack;
3. add or update negative tests where practical;
4. include rollback/mitigation notes in the change record.
