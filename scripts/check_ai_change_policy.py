#!/usr/bin/env python3
"""
AI change policy checker.

This script enforces minimum repository-memory artifacts for non-trivial code changes.

Default behavior:
- Compares BASE_REF...HEAD, where BASE_REF defaults to origin/main.
- If source code changes, require context pack + task plan + AI change record + tests or justification.

Customize CODE_PATHS, TEST_PATHS, and SENSITIVE_RULES for your project.
"""

from __future__ import annotations

import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Iterable, List


CODE_PATHS = (
    "src/",
    "lib/",
    "app/",
    "packages/",
    "services/",
)

TEST_PATHS = (
    "tests/",
    "test/",
    "spec/",
    "__tests__/",
)

DOC_ONLY_PATHS = (
    "README.md",
    "docs/",
    "ai/context/",
)

SENSITIVE_RULES = [
    {
        "name": "security-sensitive change",
        "paths": ("src/auth/", "src/security/", "src/crypto/", "security/"),
        "required_invariants": ("security",),
        "require_rollback": True,
    },
    {
        "name": "storage-sensitive change",
        "paths": ("src/storage/", "storage/", "migrations/", "db/"),
        "required_invariants": ("storage",),
        "require_rollback": True,
    },
    {
        "name": "api compatibility change",
        "paths": ("api/", "proto/", "openapi/", "schemas/"),
        "required_invariants": ("api-compatibility",),
        "require_adr": True,
    },
    {
        "name": "concurrency-sensitive change",
        "paths": ("src/concurrency/", "src/scheduler/", "scheduler/", "workers/"),
        "required_invariants": ("concurrency",),
        "require_rollback": False,
    },
]


def run(cmd: List[str]) -> str:
    try:
        return subprocess.check_output(cmd, text=True, stderr=subprocess.STDOUT).strip()
    except subprocess.CalledProcessError as exc:
        print(exc.output)
        raise


def changed_files() -> List[str]:
    base_ref = os.environ.get("BASE_REF", "origin/main")
    try:
        out = run(["git", "diff", "--name-only", f"{base_ref}...HEAD"])
    except Exception:
        # Fallback useful for local repos without origin/main.
        out = run(["git", "diff", "--name-only", "HEAD~1...HEAD"])
    return [line.strip() for line in out.splitlines() if line.strip()]


def startswith_any(path: str, prefixes: Iterable[str]) -> bool:
    return any(path.startswith(prefix) for prefix in prefixes)


def has_changed_under(files: Iterable[str], prefixes: Iterable[str]) -> bool:
    return any(startswith_any(f, prefixes) for f in files)


def files_under(files: Iterable[str], prefixes: Iterable[str]) -> List[str]:
    return [f for f in files if startswith_any(f, prefixes)]


def read_changed_text(files: Iterable[str]) -> str:
    chunks = []
    for file in files:
        p = Path(file)
        if p.exists() and p.is_file() and p.stat().st_size < 500_000:
            try:
                chunks.append(f"\n--- {file} ---\n" + p.read_text(encoding="utf-8"))
            except UnicodeDecodeError:
                pass
    return "\n".join(chunks)


def main() -> int:
    files = changed_files()

    if not files:
        print("No changed files detected. AI change policy passed.")
        return 0

    code_files = files_under(files, CODE_PATHS)
    tests_changed = has_changed_under(files, TEST_PATHS)
    context_pack_changed = has_changed_under(files, ("ai/context-packs/",))
    task_plan_changed = any(re.match(r"ai/tasks/.+/plan\.md$", f) for f in files)
    change_record_md_changed = any(re.match(r"ai/changes/.+\.md$", f) for f in files)
    change_record_yaml_changed = any(re.match(r"ai/changes/.+\.(yaml|yml)$", f) for f in files)
    adr_changed = has_changed_under(files, ("docs/adr/",))

    errors: List[str] = []
    warnings: List[str] = []

    if code_files:
        if not context_pack_changed:
            errors.append("Code changed but no context pack was added/updated under ai/context-packs/.")
        if not task_plan_changed:
            errors.append("Code changed but no task plan was added/updated under ai/tasks/<task>/plan.md.")
        if not change_record_md_changed:
            errors.append("Code changed but no Markdown AI change record was added/updated under ai/changes/.")
        if not change_record_yaml_changed:
            errors.append("Code changed but no YAML AI change metadata was added/updated under ai/changes/.")
        if not tests_changed:
            warnings.append("Code changed but no tests changed. This is allowed only if the AI change record explicitly justifies it.")

    changed_text = read_changed_text(files)

    if code_files and not tests_changed:
        if "Tests not added" not in changed_text and "tests are not applicable" not in changed_text.lower():
            errors.append(
                "Code changed without tests and without an explicit test justification phrase in changed docs. "
                "Add tests or document: 'Tests not added' / 'tests are not applicable'."
            )

    for rule in SENSITIVE_RULES:
        touched = files_under(files, rule["paths"])
        if not touched:
            continue

        rule_name = rule["name"]
        for invariant in rule.get("required_invariants", ()):  # type: ignore[arg-type]
            invariant_doc_changed_or_referenced = (
                f"docs/invariants/{invariant}.md" in changed_text
                or any(f == f"docs/invariants/{invariant}.md" for f in files)
                or invariant in changed_text
            )
            if not invariant_doc_changed_or_referenced:
                errors.append(
                    f"{rule_name}: touched {touched}, but invariant '{invariant}' was not referenced/reviewed."
                )

        if rule.get("require_rollback"):
            if "Rollback plan" not in changed_text and "rollback_plan_exists: true" not in changed_text:
                errors.append(f"{rule_name}: rollback plan is required but not found.")

        if rule.get("require_adr") and not adr_changed:
            if "ADR-" not in changed_text and "adrs_referenced" not in changed_text:
                errors.append(f"{rule_name}: ADR or ADR reference is required but not found.")

    print("Changed files:")
    for f in files:
        print(f"- {f}")

    if warnings:
        print("\nWarnings:")
        for warning in warnings:
            print(f"- {warning}")

    if errors:
        print("\nAI change policy check failed:")
        for error in errors:
            print(f"- {error}")
        return 1

    print("\nAI change policy check passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
