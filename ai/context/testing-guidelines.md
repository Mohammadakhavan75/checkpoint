# Testing Guidelines

Customize this file for the project.

## Required test levels

| Change type | Required verification |
|---|---|
| Pure docs | Markdown/link checks if available |
| Small bugfix | Unit test covering regression |
| Feature | Unit + integration tests |
| Public API change | Compatibility test + documentation update |
| Storage/migration change | Migration test + rollback/migration note |
| Security-sensitive change | Negative tests + abuse/failure cases |
| Concurrency change | Race/regression test where practical |

## Test command examples

Replace with project-specific commands:

```bash
make test
make lint
make check
```

## When tests are not added

The AI change record must explain why tests are not applicable or feasible, and what verification was done instead.
