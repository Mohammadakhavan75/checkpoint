# Security Best-Practices Review

Review target: Checkpoint at `34216cdea4ffb448adf8b31ad76ae3bc37a0ce4a`

Review date: 2026-06-22

Release containing fixes: v0.15.0

## Executive summary

The repository-wide focused review found one reportable dependency finding: the same-origin
StackEdit application shipped Handlebars 4.0.11, a version covered by several critical public
advisories. The application-level severity was calibrated to medium because the vulnerable
compiler was reachable, but an advisory-specific exploit through StackEdit's opaque UI was not
reproduced.

No application finding survived validation and attack-path policy at critical or high severity.
Three additional defects were confirmed and patched as defense in depth: unsanitized Markdown,
cross-owner item hierarchy traversal, and a high-advisory Vite version whose demonstrated path
was limited to a Windows development server. Production secret defaults were also removed.

## Reportable finding

### SEC-001 — Known-vulnerable Handlebars runtime in same-origin StackEdit

- Final severity: medium; upstream advisories include critical ratings.
- Confidence: medium.
- Pre-fix location: `web/public/stackedit/055bfb9ab79653ee7258.worker.js:1`.
- Reachability: `SnapshotLog` opened `/stackedit/app`, and Vite routed that public path in
  development and production preview.
- Evidence: the worker declared `VERSION="4.0.11"` and invoked both
  `Handlebars.compile(t.data[0])` and `safeEval(t.data[2])`.
- Public advisories:
  [GHSA-2w6w-674q-4c4q](https://github.com/advisories/GHSA-2w6w-674q-4c4q),
  [GHSA-765h-qjxv-5f44](https://github.com/advisories/GHSA-765h-qjxv-5f44), and
  [GHSA-f2jv-r9rf-7988](https://github.com/advisories/GHSA-f2jv-r9rf-7988).
- Resolution: fixed. The entire vendored StackEdit application, bridge dependency, Vite route,
  workers, scripts, styles, and fonts were removed. The built-in note editor remains.

## Defense-in-depth fixes

### SEC-H01 — Stored Markdown crossed into raw DOM HTML

The previous renderer passed `marked.parse()` output directly to
`dangerouslySetInnerHTML`. A browser payload confirmed that event-handler attributes could
execute, but the ordinary write/read path was limited to the same authenticated owner, so the
candidate was not reported as a cross-user vulnerability.

Resolution: `web/src/security/markdown.ts` sanitizes generated HTML with DOMPurify before
rendering. A jsdom regression test covers event handlers, scriptable URLs, ordinary Markdown,
and interactive task-list checkboxes.

### SEC-H02 — Item hierarchy operations were not owner-scoped

`parent_id` creation accepted another user's item UUID, while child lookup and cascade helpers
filtered only by parent identifier. Runtime validation showed that a later victim action could
mutate the attacker's child. The path required UUID disclosure and a victim action and did not
read victim data, so it did not survive the reportability gate.

Resolution: parent creation now requires an owner-scoped parent lookup. `get_children()` and
`is_parent()` require `owner_id`, and all cascade, rollup, serialization, restore, and phase
reconciliation call sites preserve that scope. API and service regressions cover cross-owner
parent rejection and cascade isolation.

### SEC-H03 — Vite version matched current public advisories

Vite 5.4.21 matched
[GHSA-fx2h-pf6j-xcff](https://github.com/advisories/GHSA-fx2h-pf6j-xcff) and
[GHSA-4w7w-66w2-5vf9](https://github.com/advisories/GHSA-4w7w-66w2-5vf9). The high-severity
path requires the development server on Windows/NTFS, while the documented production image is
Linux and uses preview mode, so it was not reported as a production attack path.

Resolution: Vite was upgraded to 8.0.16 and `@vitejs/plugin-react` to 6.0.2. The lockfile now
audits with zero known npm vulnerabilities.

### SEC-H04 — Production Compose had development credential fallbacks

Resolution: Compose now fails when `DB_PASSWORD` or `JWT_SECRET` is absent, declares
`APP_ENV=production`, disables demo seeding, and the API validates production database, JWT,
and seed invariants at startup. The web image uses reproducible `npm ci`.

## Verification

- `npm run test:security`: 3 passed.
- `npm run build`: passed with Vite 8.0.16 and prerender output generated.
- `npm audit --audit-level=moderate`: zero vulnerabilities.
- `.venv/bin/pytest`: 71 passed.
- `uvx pip-audit -r api/requirements.txt`: no known vulnerabilities.
- `uvx bandit -r api/app -ll`: no medium- or high-severity findings.
- `docker compose config --quiet`: passed with explicit non-production test secrets.
- Repository guard: the StackEdit route, bridge dependency, public bundle, and Handlebars 4.0.11
  marker are absent.

The canonical Codex Security scan report and machine-readable evidence are generated outside
the repository and linked from the pull request.

## Scope limitation

This was a focused parent-agent standard scan, not a variance-reducing multi-agent deep scan.
The reviewed primary runtime, dependency, and operations surfaces are recorded in the canonical
coverage artifact. Ignored nested worktrees, generated graph output, and unrelated untracked
design/video directories were excluded from deployment analysis.
