"""Tests for decision history tracking, run.status state guardrails on put_decisions,
and detailed audit logging.
"""

import pytest


async def _login(client, username: str, password: str) -> str:
    response = await client.post(
        "/api/v1/sessions",
        json={"username": username, "password": password},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_put_decisions_blocked_when_not_in_review_or_ready_state(client):
    """PUT /decisions only allowed in REVIEW_REQUIRED or READY_TO_BUILD.
    Blocked once VERIFIED, PUBLISHED, CANCELLED, or FAILED.
    """
    token = await _login(client, "dpo", "dpo123")
    created = await client.post(
        "/api/v1/runs",
        headers=_auth(token),
        json={"source_id": "sql-demo"},
    )
    assert created.status_code == 201
    run = created.json()
    run_id = run["id"]
    assert run["status"] == "REVIEW_REQUIRED"

    # In REVIEW_REQUIRED, PUT /decisions is allowed
    profiles = run["field_profiles"]
    decisions = []
    for p in profiles:
        act = "DROP" if p["classification"] == "UNKNOWN" else p["recommended_action"]
        decisions.append({
            "field_profile_id": p["id"],
            "action": act,
            "reason": "initial review",
        })

    put_res = await client.put(
        f"/api/v1/runs/{run_id}/decisions",
        headers=_auth(token),
        json={"decisions": decisions},
    )
    assert put_res.status_code == 200
    assert put_res.json()["status"] == "READY_TO_BUILD"

    # In READY_TO_BUILD, revising decisions is still allowed
    revised_decisions = [
        {
            "field_profile_id": profiles[0]["id"],
            "action": "DROP",
            "reason": "re-evaluating before build",
        }
    ]
    put_res2 = await client.put(
        f"/api/v1/runs/{run_id}/decisions",
        headers=_auth(token),
        json={"decisions": revised_decisions},
    )
    assert put_res2.status_code == 200

    # Build the dataset -> run becomes VERIFIED
    build_res = await client.post(f"/api/v1/runs/{run_id}/build", headers=_auth(token))
    assert build_res.status_code == 200
    dataset_id = build_res.json()["dataset"]["id"]
    assert build_res.json()["run"]["status"] == "VERIFIED"

    # Now attempt PUT /decisions when run is VERIFIED -> MUST be 422
    blocked_verified = await client.put(
        f"/api/v1/runs/{run_id}/decisions",
        headers=_auth(token),
        json={"decisions": revised_decisions},
    )
    assert blocked_verified.status_code == 422
    assert "REVIEW_REQUIRED hoặc READY_TO_BUILD" in blocked_verified.json()["detail"]

    # Publish the dataset -> run becomes PUBLISHED
    pub_res = await client.post(f"/api/v1/datasets/{dataset_id}/publish", headers=_auth(token))
    assert pub_res.status_code == 200

    # Attempt PUT /decisions when run is PUBLISHED -> MUST be 422
    blocked_published = await client.put(
        f"/api/v1/runs/{run_id}/decisions",
        headers=_auth(token),
        json={"decisions": revised_decisions},
    )
    assert blocked_published.status_code == 422
    assert "PUBLISHED" in blocked_published.json()["detail"]


@pytest.mark.asyncio
async def test_decision_history_records_before_and_after(client):
    """Verifies that decision history tracks before/after action, reason, and versions."""
    token = await _login(client, "dpo", "dpo123")
    created = await client.post(
        "/api/v1/runs",
        headers=_auth(token),
        json={"source_id": "sql-demo"},
    )
    run_id = created.json()["id"]
    profiles = created.json()["field_profiles"]
    p1 = profiles[0]

    # 1. Initial decision for p1 (version 1)
    act1 = "DROP" if p1["classification"] == "UNKNOWN" else p1["recommended_action"]
    res1 = await client.put(
        f"/api/v1/runs/{run_id}/decisions",
        headers=_auth(token),
        json={"decisions": [{"field_profile_id": p1["id"], "action": act1, "reason": "reason_v1"}]},
    )
    assert res1.status_code == 200
    data1 = res1.json()
    assert len(data1["decision_history"]) == 1
    h1 = data1["decision_history"][0]
    assert h1["field_profile_id"] == p1["id"]
    assert h1["from_action"] is None
    assert h1["to_action"] == act1
    assert h1["from_reason"] is None
    assert h1["to_reason"] == "reason_v1"
    assert h1["version"] == 1

    # 2. Update decision for p1 (version 2)
    act2 = "MASK" if act1 != "MASK" and p1["classification"] != "UNKNOWN" else "DROP"
    res2 = await client.put(
        f"/api/v1/runs/{run_id}/decisions",
        headers=_auth(token),
        json={"decisions": [{"field_profile_id": p1["id"], "action": act2, "reason": "reason_v2"}]},
    )
    assert res2.status_code == 200
    data2 = res2.json()
    assert len(data2["decision_history"]) == 2
    h2 = data2["decision_history"][1]
    assert h2["field_profile_id"] == p1["id"]
    assert h2["from_action"] == act1
    assert h2["to_action"] == act2
    assert h2["from_reason"] == "reason_v1"
    assert h2["to_reason"] == "reason_v2"
    assert h2["version"] == 2

    # Check that decision object itself shows version 2
    d_obj = next(d for d in data2["field_decisions"] if d["field_profile_id"] == p1["id"])
    assert d_obj["decision_version"] == 2
    assert d_obj["action"] == act2


@pytest.mark.asyncio
async def test_audit_log_contains_detailed_changes(client):
    """Verifies that the audit log records detailed field transitions rather than just count=N."""
    token = await _login(client, "dpo", "dpo123")
    created = await client.post(
        "/api/v1/runs",
        headers=_auth(token),
        json={"source_id": "sql-demo"},
    )
    run_id = created.json()["id"]
    profiles = created.json()["field_profiles"]
    p1 = profiles[0]

    act1 = "DROP" if p1["classification"] == "UNKNOWN" else p1["recommended_action"]
    await client.put(
        f"/api/v1/runs/{run_id}/decisions",
        headers=_auth(token),
        json={"decisions": [{"field_profile_id": p1["id"], "action": act1, "reason": "audit test reason"}]},
    )

    # Query audit logs
    audit_res = await client.get(
        "/api/v1/audit?action=save_decisions&entity_type=run",
        headers=_auth(token),
    )
    assert audit_res.status_code == 200
    logs = audit_res.json()
    matching = [entry for entry in logs if entry["entity_id"] == str(run_id)]
    assert len(matching) >= 1
    latest_audit = matching[0]

    # Verify detail format: count=1; changes=[field[v1]: NEW -> ... (reason: '...')]
    assert "count=1" in latest_audit["reason"]
    assert "changes=[" in latest_audit["reason"]
    assert f"[v1]: NEW -> {act1}" in latest_audit["reason"]
    assert "audit test reason" in latest_audit["reason"]
