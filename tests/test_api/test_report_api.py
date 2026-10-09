"""API tests for compliance report and risk score endpoints (FR-09, FR-10)."""

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
async def test_get_report_json_and_html(client):
    dpo_token = await _login(client, "dpo", "dpo123")

    # 1. Create a run
    created = await client.post(
        "/api/v1/runs",
        headers=_auth(dpo_token),
        json={"source_id": "sql-demo"},
    )
    assert created.status_code == 201
    run_id = created.json()["id"]

    # 2. Get report as JSON
    report_json_res = await client.get(
        f"/api/v1/runs/{run_id}/report",
        headers=_auth(dpo_token),
    )
    assert report_json_res.status_code == 200
    report_data = report_json_res.json()

    assert report_data["run_id"] == run_id
    assert "report_id" in report_data
    assert "versions" in report_data
    assert "taxonomy_version" in report_data["versions"]
    assert "recognizer_version" in report_data["versions"]
    assert "risk_assessment" in report_data
    assert "metrics" in report_data
    assert "inventory" in report_data
    assert "limitations" in report_data
    assert "audit_proof" in report_data
    assert "content_hash" in report_data["audit_proof"]

    # Check zero raw PII:
    blob = str(report_data).lower()
    assert "sample" not in blob or "masked_sample" in blob
    assert "password" not in blob

    # 3. Get report as HTML
    report_html_res = await client.get(
        f"/api/v1/runs/{run_id}/report?format=html",
        headers=_auth(dpo_token),
    )
    assert report_html_res.status_code == 200
    assert "text/html" in report_html_res.headers["content-type"]
    html_text = report_html_res.text
    assert "<!DOCTYPE html>" in html_text
    assert "BÁO CÁO TUÂN THỦ BẢO VỆ DỮ LIỆU CÁ NHÂN (PII)" in html_text
    assert report_data["report_id"] in html_text


@pytest.mark.asyncio
async def test_get_risk_score_endpoint(client):
    dpo_token = await _login(client, "dpo", "dpo123")

    # 1. Create a run
    created = await client.post(
        "/api/v1/runs",
        headers=_auth(dpo_token),
        json={"source_id": "sql-demo"},
    )
    assert created.status_code == 201
    run_id = created.json()["id"]

    # 2. Get risk score
    risk_res = await client.get(
        f"/api/v1/runs/{run_id}/risk-score",
        headers=_auth(dpo_token),
    )
    assert risk_res.status_code == 200
    risk_data = risk_res.json()
    assert "score" in risk_data
    assert "tier" in risk_data
    assert "action_required" in risk_data
    assert "drivers" in risk_data
    assert 0.0 <= risk_data["score"] <= 100.0


@pytest.mark.asyncio
async def test_analyst_access_controls_and_summary_report(client):
    dpo_token = await _login(client, "dpo", "dpo123")
    analyst_token = await _login(client, "analyst", "analyst123")

    # 1. Create run as DPO (unpublished)
    created = await client.post(
        "/api/v1/runs",
        headers=_auth(dpo_token),
        json={"source_id": "sql-demo"},
    )
    run = created.json()
    run_id = run["id"]

    # 2. Analyst attempts to view report or risk-score on UNPUBLISHED run -> 403 Forbidden!
    unpub_rep = await client.get(
        f"/api/v1/runs/{run_id}/report",
        headers=_auth(analyst_token),
    )
    assert unpub_rep.status_code == 403
    assert "chưa công bố (PUBLISHED)" in unpub_rep.json()["detail"]

    unpub_risk = await client.get(
        f"/api/v1/runs/{run_id}/risk-score",
        headers=_auth(analyst_token),
    )
    assert unpub_risk.status_code == 403

    # DPO CAN view full report on unpublished run
    dpo_rep = await client.get(f"/api/v1/runs/{run_id}/report", headers=_auth(dpo_token))
    assert dpo_rep.status_code == 200
    assert dpo_rep.json()["summary_view"] is False
    assert len(dpo_rep.json()["inventory"]) > 0

    # 3. DPO reviews, builds, and publishes dataset
    decisions = []
    for p in run["field_profiles"]:
        act = "DROP" if p["classification"] == "UNKNOWN" else p["recommended_action"]
        decisions.append({"field_profile_id": p["id"], "action": act, "reason": "reviewed"})
    await client.put(f"/api/v1/runs/{run_id}/decisions", headers=_auth(dpo_token), json={"decisions": decisions})

    build_res = await client.post(f"/api/v1/runs/{run_id}/build", headers=_auth(dpo_token))
    assert build_res.status_code == 200
    dataset_id = build_res.json()["dataset"]["id"]

    pub_res = await client.post(f"/api/v1/datasets/{dataset_id}/publish", headers=_auth(dpo_token))
    assert pub_res.status_code == 200

    # 4. Once published and granted, Analyst CAN access report and risk score
    analyst_risk = await client.get(
        f"/api/v1/runs/{run_id}/risk-score",
        headers=_auth(analyst_token),
    )
    assert analyst_risk.status_code == 200

    analyst_rep = await client.get(
        f"/api/v1/runs/{run_id}/report",
        headers=_auth(analyst_token),
    )
    assert analyst_rep.status_code == 200
    rep_data = analyst_rep.json()
    assert rep_data["summary_view"] is True
    assert rep_data["report_type"] == "SUMMARY"
    # Granular inventory is hidden from Analyst (§3)
    assert rep_data["inventory"] == []
    # But high-level metrics and risk score are present
    assert "metrics" in rep_data
    assert "risk_assessment" in rep_data

    # 5. Access report via ?token= query parameter (browser new tab / download flow)
    rep_query_token = await client.get(f"/api/v1/runs/{run_id}/report?format=html&token={dpo_token}")
    assert rep_query_token.status_code == 200
    assert "text/html" in rep_query_token.headers["content-type"]

