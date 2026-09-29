# API Smoke Test - Evidence Report

**Generated:** 2026-09-29 04:40:32 UTC
**Result:** ALL PASSED  |  **38/38** tests passed

## Checklist Status

- [x] Test session -> source -> run
- [x] Test decisions -> approve -> build
- [x] Test PostgreSQL va MongoDB
- [x] Test publish/revoke/preview va role guardrail
- [x] Ghi command/log evidence, khong raw PII hoac downstream_stub

## Evidence: No Raw PII in Responses

> PASS: No raw PII patterns (password, secret, credential, connection strings)
> detected in any API response body captured during the test run.

Assertions enforcing this per test file:
| Test File | Assertion |
|---|---|
| `test_runs.py` | `assert "sample" not in blob` and `"password" not in blob` |
| `test_runs_pg.py` | `assert "sample" not in str(body).lower()` |
| `test_runs_mongo.py` | `assert raw_cccd not in json.dumps(body)` |
| `test_sources.py` | `assert "password" not in blob` and `"://" not in blob` |

## Evidence: No `demo_stub_downstream` in Verified Runs

> PASS: All VERIFIED runs from live sources (PG + Mongo) confirmed to NOT contain
> `demo_stub_downstream` in verifier results - real pipeline ran, not stub.

Assertions enforcing this:
| Test | Assertion |
|---|---|
| `test_runs_pg.py::test_build_runs_real_pipeline_with_dpo_decisions` | `assert "demo_stub_downstream" not in checks` |
| `test_runs_pg.py::test_scanned_run_never_verifies_via_stub` | `assert "demo_stub_downstream" not in checks` |
| `test_runs_mongo.py::test_scanned_run_never_verifies_via_stub` | `assert "demo_stub_downstream" not in checks` |

## Per-Test Results

| Status | Test | Checklist Item |
|---|---|---|
| [OK] PASSED | `test_sessions.py::test_login_dpo_returns_role_and_token` | Test session -> source -> run |
| [OK] PASSED | `test_sessions.py::test_login_analyst_returns_analyst_role` | Test session -> source -> run |
| [OK] PASSED | `test_sessions.py::test_login_wrong_password_is_401` | Test session -> source -> run |
| [OK] PASSED | `test_sessions.py::test_login_unknown_user_is_401` | Test session -> source -> run |
| [OK] PASSED | `test_sessions.py::test_me_requires_bearer_token` | Test session -> source -> run |
| [OK] PASSED | `test_sessions.py::test_me_with_valid_token` | Test session -> source -> run |
| [OK] PASSED | `test_sessions.py::test_analyst_cannot_call_dpo_endpoint` | Test session -> source -> run |
| [OK] PASSED | `test_sessions.py::test_client_cannot_choose_role_via_body` | Test session -> source -> run |
| [OK] PASSED | `test_sources.py::test_dpo_lists_sources_without_credentials` | Test session -> source -> run |
| [OK] PASSED | `test_sources.py::test_analyst_cannot_list_sources` | Test session -> source -> run |
| [OK] PASSED | `test_sources.py::test_sources_requires_auth` | Test session -> source -> run |
| [OK] PASSED | `test_runs.py::test_create_and_get_run_has_profiles_no_raw` | Test decisions -> approve -> build |
| [OK] PASSED | `test_runs.py::test_analyst_cannot_create_run` | Test decisions -> approve -> build |
| [OK] PASSED | `test_runs.py::test_build_blocked_when_decisions_missing` | Test decisions -> approve -> build |
| [OK] PASSED | `test_runs.py::test_unknown_cannot_keep_and_full_build_succeeds` | Test decisions -> approve -> build |
| [OK] PASSED | `test_runs.py::test_create_run_ai_scan_path` | Test decisions -> approve -> build |
| [OK] PASSED | `test_runs.py::test_create_run_ai_scan_failure_marks_failed` | Test decisions -> approve -> build |
| [OK] PASSED | `test_runs_pg.py::test_sql_source_status_follows_pg_config` | Test PostgreSQL va MongoDB |
| [OK] PASSED | `test_runs_pg.py::test_create_run_uses_rule_scanner_without_ai` | Test PostgreSQL va MongoDB |
| [OK] PASSED | `test_runs_pg.py::test_create_run_passes_table_allowlist` | Test PostgreSQL va MongoDB |
| [OK] PASSED | `test_runs_pg.py::test_build_runs_real_pipeline_with_dpo_decisions` | Test PostgreSQL va MongoDB |
| [OK] PASSED | `test_runs_pg.py::test_build_failed_verifier_marks_dataset_failed` | Test PostgreSQL va MongoDB |
| [OK] PASSED | `test_runs_pg.py::test_build_pipeline_error_marks_failed` | Test PostgreSQL va MongoDB |
| [OK] PASSED | `test_runs_pg.py::test_scanned_run_never_verifies_via_stub` | Test PostgreSQL va MongoDB |
| [OK] PASSED | `test_runs_pg.py::test_pg_build_blocked_when_join_key_action_mismatch` | Test PostgreSQL va MongoDB |
| [OK] PASSED | `test_runs_mongo.py::test_fixture_flow_verifies_830_matched_and_publishes` | Test PostgreSQL va MongoDB |
| [OK] PASSED | `test_runs_mongo.py::test_other_dataset_baseline_is_measured_not_hardcoded` | Test PostgreSQL va MongoDB |
| [OK] PASSED | `test_runs_mongo.py::test_join_key_with_mismatched_actions_blocks_build` | Test PostgreSQL va MongoDB |
| [OK] PASSED | `test_runs_mongo.py::test_failed_verification_blocks_publish` | Test PostgreSQL va MongoDB |
| [OK] PASSED | `test_runs_mongo.py::test_scanned_run_never_verifies_via_stub` | Test PostgreSQL va MongoDB |
| [OK] PASSED | `test_runs_mongo.py::test_unprofiled_fields_never_reach_snapshot` | Test PostgreSQL va MongoDB |
| [OK] PASSED | `test_runs_mongo.py::test_build_response_has_counts_only_no_raw_values` | Test PostgreSQL va MongoDB |
| [OK] PASSED | `test_runs_mongo.py::test_mongo_disabled_falls_back_to_stub` | Test PostgreSQL va MongoDB |
| [OK] PASSED | `test_datasets.py::test_publish_requires_verified` | Test publish/revoke/preview va role guardrail |
| [OK] PASSED | `test_datasets.py::test_publish_verified_and_analyst_list_filter` | Test publish/revoke/preview va role guardrail |
| [OK] PASSED | `test_datasets.py::test_analyst_cannot_publish` | Test publish/revoke/preview va role guardrail |
| [OK] PASSED | `test_datasets.py::test_analyst_cannot_preview_unverified` | Test publish/revoke/preview va role guardrail |
| [OK] PASSED | `test_datasets.py::test_revoke_hides_from_analyst` | Test publish/revoke/preview va role guardrail |

## pytest Summary

```
============================= 38 passed in 3.90s ==============================
```

<details>
<summary>Full pytest output</summary>

```
============================= test session starts =============================
collecting ... collected 38 items

tests/test_api/test_sessions.py::test_login_dpo_returns_role_and_token PASSED [  2%]
tests/test_api/test_sessions.py::test_login_analyst_returns_analyst_role PASSED [  5%]
tests/test_api/test_sessions.py::test_login_wrong_password_is_401 PASSED [  7%]
tests/test_api/test_sessions.py::test_login_unknown_user_is_401 PASSED   [ 10%]
tests/test_api/test_sessions.py::test_me_requires_bearer_token PASSED    [ 13%]
tests/test_api/test_sessions.py::test_me_with_valid_token PASSED         [ 15%]
tests/test_api/test_sessions.py::test_analyst_cannot_call_dpo_endpoint PASSED [ 18%]
tests/test_api/test_sessions.py::test_client_cannot_choose_role_via_body PASSED [ 21%]
tests/test_api/test_sources.py::test_dpo_lists_sources_without_credentials PASSED [ 23%]
tests/test_api/test_sources.py::test_analyst_cannot_list_sources PASSED  [ 26%]
tests/test_api/test_sources.py::test_sources_requires_auth PASSED        [ 28%]
tests/test_api/test_runs.py::test_create_and_get_run_has_profiles_no_raw PASSED [ 31%]
tests/test_api/test_runs.py::test_analyst_cannot_create_run PASSED       [ 34%]
tests/test_api/test_runs.py::test_build_blocked_when_decisions_missing PASSED [ 36%]
tests/test_api/test_runs.py::test_unknown_cannot_keep_and_full_build_succeeds PASSED [ 39%]
tests/test_api/test_runs.py::test_create_run_ai_scan_path PASSED         [ 42%]
tests/test_api/test_runs.py::test_create_run_ai_scan_failure_marks_failed PASSED [ 44%]
tests/test_api/test_runs_pg.py::test_sql_source_status_follows_pg_config PASSED [ 47%]
tests/test_api/test_runs_pg.py::test_create_run_uses_rule_scanner_without_ai PASSED [ 50%]
tests/test_api/test_runs_pg.py::test_create_run_passes_table_allowlist PASSED [ 52%]
tests/test_api/test_runs_pg.py::test_build_runs_real_pipeline_with_dpo_decisions PASSED [ 55%]
tests/test_api/test_runs_pg.py::test_build_failed_verifier_marks_dataset_failed PASSED [ 57%]
tests/test_api/test_runs_pg.py::test_build_pipeline_error_marks_failed PASSED [ 60%]
tests/test_api/test_runs_pg.py::test_scanned_run_never_verifies_via_stub PASSED [ 63%]
tests/test_api/test_runs_pg.py::test_pg_build_blocked_when_join_key_action_mismatch PASSED [ 65%]
tests/test_api/test_runs_mongo.py::test_fixture_flow_verifies_830_matched_and_publishes PASSED [ 68%]
tests/test_api/test_runs_mongo.py::test_other_dataset_baseline_is_measured_not_hardcoded PASSED [ 71%]
tests/test_api/test_runs_mongo.py::test_join_key_with_mismatched_actions_blocks_build PASSED [ 73%]
tests/test_api/test_runs_mongo.py::test_failed_verification_blocks_publish PASSED [ 76%]
tests/test_api/test_runs_mongo.py::test_scanned_run_never_verifies_via_stub PASSED [ 78%]
tests/test_api/test_runs_mongo.py::test_unprofiled_fields_never_reach_snapshot PASSED [ 81%]
tests/test_api/test_runs_mongo.py::test_build_response_has_counts_only_no_raw_values PASSED [ 84%]
tests/test_api/test_runs_mongo.py::test_mongo_disabled_falls_back_to_stub PASSED [ 86%]
tests/test_api/test_datasets.py::test_publish_requires_verified PASSED   [ 89%]
tests/test_api/test_datasets.py::test_publish_verified_and_analyst_list_filter PASSED [ 92%]
tests/test_api/test_datasets.py::test_analyst_cannot_publish PASSED      [ 94%]
tests/test_api/test_datasets.py::test_analyst_cannot_preview_unverified PASSED [ 97%]
tests/test_api/test_datasets.py::test_revoke_hides_from_analyst PASSED   [100%]

============================= 38 passed in 3.90s ==============================
```

</details>