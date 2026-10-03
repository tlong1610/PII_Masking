"""Tests for FR-06, FR-07, §2.2, §9.2:
Sàn che tối thiểu (Minimum Masking Floor), bắt buộc lý do khi ghi đè,
và ngoại lệ khi hạ mức (is_exception + reason + exception_until).
"""

from datetime import UTC, datetime, timedelta

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
async def test_probe_keep_on_pii_fields_with_empty_reason_blocked(client):
    """Probe repro: KEEP on phone/email/full_name with reason="" MUST return 422."""
    token = await _login(client, "dpo", "dpo123")
    created = await client.post(
        "/api/v1/runs",
        headers=_auth(token),
        json={"source_id": "sql-demo"},
    )
    assert created.status_code == 201
    run = created.json()
    run_id = run["id"]
    profiles_by_name = {p["field_path"]: p for p in run["field_profiles"]}

    for field_name in ["phone", "email", "full_name"]:
        p = profiles_by_name.get(field_name)
        assert p is not None, f"Expected {field_name} in sql-demo field profiles"

        res = await client.put(
            f"/api/v1/runs/{run_id}/decisions",
            headers=_auth(token),
            json={
                "decisions": [
                    {
                        "field_profile_id": p["id"],
                        "action": "KEEP",
                        "reason": "",
                    }
                ]
            },
        )
        assert res.status_code == 422
        err_msg = res.json()["detail"]
        assert "yếu hơn mức che tối thiểu" in err_msg or "Bắt buộc phải cung cấp lý do" in err_msg


@pytest.mark.asyncio
async def test_keep_on_pii_without_exception_blocked_even_with_reason(client):
    """KEEP on PII (L2) with reason but WITHOUT is_exception=True MUST return 422."""
    token = await _login(client, "dpo", "dpo123")
    created = await client.post(
        "/api/v1/runs",
        headers=_auth(token),
        json={"source_id": "sql-demo"},
    )
    run = created.json()
    run_id = run["id"]
    phone_p = next(p for p in run["field_profiles"] if p["field_path"] == "phone")

    res = await client.put(
        f"/api/v1/runs/{run_id}/decisions",
        headers=_auth(token),
        json={
            "decisions": [
                {
                    "field_profile_id": phone_p["id"],
                    "action": "KEEP",
                    "reason": "Business requested unmasked phone numbers",
                    "is_exception": False,
                }
            ]
        },
    )
    assert res.status_code == 422
    assert "yếu hơn mức che tối thiểu" in res.json()["detail"]
    assert "is_exception=True" in res.json()["detail"]


@pytest.mark.asyncio
async def test_keep_on_pii_with_exception_requires_reason_and_future_expiry(client):
    """is_exception=True requires non-empty reason and future exception_until."""
    token = await _login(client, "dpo", "dpo123")
    created = await client.post(
        "/api/v1/runs",
        headers=_auth(token),
        json={"source_id": "sql-demo"},
    )
    run = created.json()
    run_id = run["id"]
    email_p = next(p for p in run["field_profiles"] if p["field_path"] == "email")
    future_date = (datetime.now(UTC) + timedelta(days=30)).isoformat()
    past_date = (datetime.now(UTC) - timedelta(days=1)).isoformat()

    # Case A: is_exception=True but reason is empty
    res_no_reason = await client.put(
        f"/api/v1/runs/{run_id}/decisions",
        headers=_auth(token),
        json={
            "decisions": [
                {
                    "field_profile_id": email_p["id"],
                    "action": "KEEP",
                    "reason": "   ",
                    "is_exception": True,
                    "exception_until": future_date,
                }
            ]
        },
    )
    assert res_no_reason.status_code == 422
    assert "bắt buộc phải ghi rõ lý do giải trình" in res_no_reason.json()["detail"]

    # Case B: is_exception=True but exception_until is missing
    res_no_expiry = await client.put(
        f"/api/v1/runs/{run_id}/decisions",
        headers=_auth(token),
        json={
            "decisions": [
                {
                    "field_profile_id": email_p["id"],
                    "action": "KEEP",
                    "reason": "Temporary exemption approved by committee",
                    "is_exception": True,
                    "exception_until": None,
                }
            ]
        },
    )
    assert res_no_expiry.status_code == 422
    assert "bắt buộc phải có thời hạn ngoại lệ" in res_no_expiry.json()["detail"]

    # Case C: is_exception=True but exception_until is in the past
    res_past_expiry = await client.put(
        f"/api/v1/runs/{run_id}/decisions",
        headers=_auth(token),
        json={
            "decisions": [
                {
                    "field_profile_id": email_p["id"],
                    "action": "KEEP",
                    "reason": "Old exemption",
                    "is_exception": True,
                    "exception_until": past_date,
                }
            ]
        },
    )
    assert res_past_expiry.status_code == 422
    assert "phải là một thời điểm trong tương lai" in res_past_expiry.json()["detail"]


@pytest.mark.asyncio
async def test_valid_downgrade_exception_succeeds_and_records_audit(client):
    """When valid exception is submitted (is_exception=True, reason, future date),
    PUT succeeds and audit log records exception tag.
    """
    token = await _login(client, "dpo", "dpo123")
    created = await client.post(
        "/api/v1/runs",
        headers=_auth(token),
        json={"source_id": "sql-demo"},
    )
    run = created.json()
    run_id = run["id"]
    name_p = next(p for p in run["field_profiles"] if p["field_path"] == "full_name")
    future_date = (datetime.now(UTC) + timedelta(days=90)).isoformat()

    valid_res = await client.put(
        f"/api/v1/runs/{run_id}/decisions",
        headers=_auth(token),
        json={
            "decisions": [
                {
                    "field_profile_id": name_p["id"],
                    "action": "KEEP",
                    "reason": "DPO authorized temporary pilot exception under Decree 356",
                    "is_exception": True,
                    "exception_until": future_date,
                }
            ]
        },
    )
    assert valid_res.status_code == 200
    saved = valid_res.json()
    dec = next(d for d in saved["field_decisions"] if d["field_profile_id"] == name_p["id"])
    assert dec["action"] == "KEEP"
    assert dec["is_exception"] is True
    assert dec["exception_until"] is not None

    hist = next(h for h in saved["decision_history"] if h["field_profile_id"] == name_p["id"])
    assert hist["is_exception"] is True

    # Audit check
    audit_res = await client.get("/api/v1/audit?action=save_decisions&entity_type=run", headers=_auth(token))
    assert audit_res.status_code == 200
    latest = next(e for e in audit_res.json() if e["entity_id"] == str(run_id))
    assert "[EXCEPTION until" in latest["reason"]
    assert "DPO authorized temporary pilot exception" in latest["reason"]


@pytest.mark.asyncio
async def test_override_safe_action_without_reason_blocked(client):
    """FR-07: Changing recommended action (even if not below floor) requires a reason."""
    token = await _login(client, "dpo", "dpo123")
    created = await client.post(
        "/api/v1/runs",
        headers=_auth(token),
        json={"source_id": "sql-demo"},
    )
    run = created.json()
    run_id = run["id"]
    phone_p = next(p for p in run["field_profiles"] if p["field_path"] == "phone")
    assert phone_p["recommended_action"] == "MASK"

    # Override from MASK to DROP with empty reason -> 422
    res = await client.put(
        f"/api/v1/runs/{run_id}/decisions",
        headers=_auth(token),
        json={
            "decisions": [
                {
                    "field_profile_id": phone_p["id"],
                    "action": "DROP",
                    "reason": "",
                }
            ]
        },
    )
    assert res.status_code == 422
    assert "Bắt buộc phải cung cấp lý do" in res.json()["detail"]
    assert "FR-07" in res.json()["detail"]
