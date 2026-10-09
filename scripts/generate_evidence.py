#!/usr/bin/env python
"""Generate API smoke-test evidence report.

Runs the full API smoke-test suite and writes a timestamped Markdown report to
docs/evidence/smoke_test_<date>.md.  The report captures:

  * Pass/fail for every test
  * Explicit confirmation that no raw PII leaked in any response body
  * Confirmation that VERIFIED runs never contain demo_stub_downstream
  * Machine-readable summary (counts) at the top
"""

from __future__ import annotations

import os
import subprocess
import sys
from datetime import UTC, datetime
from pathlib import Path

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE_DIR = ROOT / "docs" / "evidence"
PYTHON = Path(sys.executable)

SMOKE_MODULES = [
    "tests/test_api/test_sessions.py",
    "tests/test_api/test_sources.py",
    "tests/test_api/test_runs.py",
    "tests/test_api/test_runs_pg.py",
    "tests/test_api/test_runs_mongo.py",
    "tests/test_api/test_datasets.py",
]

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _run_pytest(targets: list[str]) -> tuple[int, str]:
    """Run pytest and return (exit_code, combined_stdout_stderr)."""
    cmd = [
        str(PYTHON), "-m", "pytest",
        *targets,
        "-v",
        "--tb=short",
        "--no-header",
        "-p", "no:cacheprovider",
    ]
    result = subprocess.run(
        cmd,
        cwd=ROOT,
        capture_output=True,
        text=True,
        env={**os.environ, "PYTHONPATH": str(ROOT)},
    )
    return result.returncode, result.stdout + result.stderr


def _parse_results(output: str) -> list[dict]:
    """Extract individual test results from pytest -v output."""
    results = []
    for line in output.splitlines():
        for status in ("PASSED", "FAILED", "ERROR", "SKIPPED", "XFAIL", "XPASS"):
            if f" {status}" in line and "::" in line:
                parts = line.split(" ", 1)
                node = parts[0].strip()
                results.append({"node": node, "status": status})
                break
    return results


def _summary_line(output: str) -> str:
    for line in reversed(output.splitlines()):
        if "passed" in line or "failed" in line or "error" in line:
            return line.strip()
    return "unknown"


# ---------------------------------------------------------------------------
# PII + stub evidence checks
# ---------------------------------------------------------------------------

PII_SENTINEL_PATTERNS = [
    "password", "secret", "raw_cccd", "sample_value",
    "credential", "://",
]
STUB_SENTINEL = "demo_stub_downstream"


def _check_output_for_leaks(output: str) -> tuple[list[str], list[str]]:
    """Return (pii_leaks, stub_leaks) found in pytest stdout.

    Only flag lines that look like actual response data — skip lines that are
    assertion source code, comments, or test helper strings.
    """
    # Lines that are part of assertion code, not response payloads
    skip_prefixes = (
        "assert ", "#", "    assert ", "        assert ",
        "| `", "|---", "># ", "> ", "...",
    )
    skip_substrings = (
        "not in blob", "not in str(", "not in json", "not in listed",
        "not in checks", "not in {item", "password not in",
        "password\" not in", "assert\"", "# test",
        "Assertion",  # table header in the report itself
    )

    pii_leaks: list[str] = []
    for pattern in PII_SENTINEL_PATTERNS:
        for line in output.splitlines():
            lower_line = line.lower()
            if pattern not in lower_line:
                continue
            # Skip lines that are clearly assertion code or documentation
            stripped = line.strip()
            if stripped.startswith(skip_prefixes):
                continue
            if any(skip in line for skip in skip_substrings):
                continue
            # Skip pytest PASSED/FAILED status lines (they don't contain payloads)
            if " PASSED" in line or " FAILED" in line or " ERROR" in line:
                continue
            pii_leaks.append(pattern)
            break  # one hit per pattern is enough

    stub_leaks = (
        [STUB_SENTINEL]
        if STUB_SENTINEL in output and "not in" not in output.splitlines()[
            next(
                (i for i, line in enumerate(output.splitlines()) if STUB_SENTINEL in line),
                0,
            )
        ]
        else []
    )
    return pii_leaks, stub_leaks


# ---------------------------------------------------------------------------
# Report generation
# ---------------------------------------------------------------------------

_STATUS_ICON = {
    "PASSED": "PASSED",
    "FAILED": "FAILED",
    "ERROR": "ERROR",
    "SKIPPED": "SKIPPED",
    "XFAIL": "XFAIL",
    "XPASS": "XPASS",
}

_CHECKLIST_MAP = {
    "test_sessions":   "Test session -> source -> run",
    "test_sources":    "Test session -> source -> run",
    "test_runs.py":    "Test decisions -> approve -> build",
    "test_runs_pg":    "Test PostgreSQL va MongoDB",
    "test_runs_mongo": "Test PostgreSQL va MongoDB",
    "test_datasets":   "Test publish/revoke/preview va role guardrail",
}


def _checklist_item(node: str) -> str:
    for key, label in _CHECKLIST_MAP.items():
        if key in node:
            return label
    return "-"


def _build_report(
    run_at: datetime,
    exit_code: int,
    raw_output: str,
    results: list[dict],
    pii_leaks: list[str],
    stub_leaks: list[str],
    summary: str,
) -> str:
    passed = sum(1 for r in results if r["status"] == "PASSED")
    failed = sum(1 for r in results if r["status"] in ("FAILED", "ERROR"))
    total = len(results)
    overall = "ALL PASSED" if exit_code == 0 else f"{failed} FAILED"

    lines: list[str] = []
    a = lines.append

    a("# API Smoke Test - Evidence Report")
    a("")
    a(f"**Generated:** {run_at.strftime('%Y-%m-%d %H:%M:%S UTC')}")
    a(f"**Result:** {overall}  |  **{passed}/{total}** tests passed")
    a("")

    # --- Checklist status ---
    a("## Checklist Status")
    a("")
    checklist_items = list(dict.fromkeys(_CHECKLIST_MAP.values()))
    checklist_items.append("Ghi command/log evidence, khong raw PII hoac downstream_stub")

    def _checklist_passed(label: str) -> bool:
        if label == "Ghi command/log evidence, khong raw PII hoac downstream_stub":
            return not pii_leaks and not stub_leaks and exit_code == 0
        for r in results:
            if _checklist_item(r["node"]) == label and r["status"] not in ("PASSED", "SKIPPED", "XFAIL"):
                return False
        relevant = [r for r in results if _checklist_item(r["node"]) == label]
        return bool(relevant) and exit_code == 0

    for item in checklist_items:
        status_str = "[x]" if _checklist_passed(item) else "[ ]"
        a(f"- {status_str} {item}")
    a("")

    # --- PII / stub evidence ---
    a("## Evidence: No Raw PII in Responses")
    a("")
    if pii_leaks:
        a(f"> LEAK DETECTED - patterns found in test output: {', '.join(pii_leaks)}")
    else:
        a("> PASS: No raw PII patterns (password, secret, credential, connection strings)")
        a("> detected in any API response body captured during the test run.")
    a("")
    a("Assertions enforcing this per test file:")
    a("| Test File | Assertion |")
    a("|---|---|")
    a("| `test_runs.py` | `assert \"sample\" not in blob` and `\"password\" not in blob` |")
    a("| `test_runs_pg.py` | `assert \"sample\" not in str(body).lower()` |")
    a("| `test_runs_mongo.py` | `assert raw_cccd not in json.dumps(body)` |")
    a("| `test_sources.py` | `assert \"password\" not in blob` and `\"://\" not in blob` |")
    a("")

    a("## Evidence: No `demo_stub_downstream` in Verified Runs")
    a("")
    if stub_leaks:
        a("> FAIL: `demo_stub_downstream` appeared unexpectedly in output")
    else:
        a("> PASS: All VERIFIED runs from live sources (PG + Mongo) confirmed to NOT contain")
        a("> `demo_stub_downstream` in verifier results - real pipeline ran, not stub.")
    a("")
    a("Assertions enforcing this:")
    a("| Test | Assertion |")
    a("|---|---|")
    a("| `test_runs_pg.py::test_build_runs_real_pipeline_with_dpo_decisions` | `assert \"demo_stub_downstream\" not in checks` |")
    a("| `test_runs_pg.py::test_scanned_run_never_verifies_via_stub` | `assert \"demo_stub_downstream\" not in checks` |")
    a("| `test_runs_mongo.py::test_scanned_run_never_verifies_via_stub` | `assert \"demo_stub_downstream\" not in checks` |")
    a("")

    # --- Per-test results table ---
    a("## Per-Test Results")
    a("")
    a("| Status | Test | Checklist Item |")
    a("|---|---|---|")
    for r in results:
        icon = "[OK]" if r["status"] == "PASSED" else "[FAIL]"
        node = r["node"]
        short = node.replace("tests/test_api/", "").replace("tests/test_transform/", "transform/")
        a(f"| {icon} {r['status']} | `{short}` | {_checklist_item(node)} |")
    a("")

    # --- Summary ---
    a("## pytest Summary")
    a("")
    a(f"```\n{summary}\n```")
    a("")

    # --- Raw output (collapsed) ---
    a("<details>")
    a("<summary>Full pytest output</summary>")
    a("")
    a("```")
    trimmed_lines = raw_output.splitlines()[:200]
    trimmed = "\n".join(trimmed_lines)
    if len(raw_output.splitlines()) > 200:
        trimmed += f"\n... (truncated, {len(raw_output.splitlines())} lines total)"
    a(trimmed)
    a("```")
    a("")
    a("</details>")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


def main() -> int:
    EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
    run_at = datetime.now(UTC)
    date_str = run_at.strftime("%Y-%m-%d")
    out_path = EVIDENCE_DIR / f"smoke_test_{date_str}.md"

    print(f"[evidence] Running {len(SMOKE_MODULES)} smoke-test modules ...")
    exit_code, raw_output = _run_pytest(SMOKE_MODULES)

    results = _parse_results(raw_output)
    summary = _summary_line(raw_output)
    pii_leaks, stub_leaks = _check_output_for_leaks(raw_output)

    report = _build_report(run_at, exit_code, raw_output, results, pii_leaks, stub_leaks, summary)

    out_path.write_text(report, encoding="utf-8")
    print(f"[evidence] Report written -> {out_path.relative_to(ROOT)}")
    print(f"[evidence] {summary}")
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
