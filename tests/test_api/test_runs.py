"""Tests for runs / decisions / build guardrails."""

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
async def test_create_and_get_run_has_profiles_no_raw(client):
    token = await _login(client, "dpo", "dpo123")
    created = await client.post(
        "/api/v1/runs",
        headers=_auth(token),
        json={"source_id": "sql-demo"},
    )
    assert created.status_code == 201
    data = created.json()
    assert data["status"] == "REVIEW_REQUIRED"
    assert data["source_type"] == "SQL"
    assert len(data["field_profiles"]) >= 3
    blob = str(data).lower()
    assert "sample" not in blob
    assert "password" not in blob

    got = await client.get(f"/api/v1/runs/{data['id']}", headers=_auth(token))
    assert got.status_code == 200
    assert got.json()["id"] == data["id"]


@pytest.mark.asyncio
async def test_analyst_cannot_create_run(client):
    token = await _login(client, "analyst", "analyst123")
    response = await client.post(
        "/api/v1/runs",
        headers=_auth(token),
        json={"source_id": "sql-demo"},
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_build_blocked_when_decisions_missing(client):
    token = await _login(client, "dpo", "dpo123")
    created = await client.post(
        "/api/v1/runs",
        headers=_auth(token),
        json={"source_id": "sql-demo"},
    )
    run_id = created.json()["id"]
    response = await client.post(f"/api/v1/runs/{run_id}/build", headers=_auth(token))
    assert response.status_code == 422
    assert "missing_field_profile_ids" in response.json()["detail"]


@pytest.mark.asyncio
async def test_unknown_cannot_keep_and_full_build_succeeds(client):
    token = await _login(client, "dpo", "dpo123")
    created = await client.post(
        "/api/v1/runs",
        headers=_auth(token),
        json={"source_id": "sql-demo"},
    )
    run = created.json()
    run_id = run["id"]
    unknown = next(p for p in run["field_profiles"] if p["classification"] == "UNKNOWN")

    bad = await client.put(
        f"/api/v1/runs/{run_id}/decisions",
        headers=_auth(token),
        json={
            "decisions": [
                {
                    "field_profile_id": unknown["id"],
                    "action": "KEEP",
                    "reason": "skip",
                }
            ]
        },
    )
    assert bad.status_code == 422

    decisions = []
    for p in run["field_profiles"]:
        action = "DROP" if p["classification"] == "UNKNOWN" else p["recommended_action"]
        decisions.append(
            {
                "field_profile_id": p["id"],
                "action": action,
                "reason": "reviewed",
            }
        )

    saved = await client.put(
        f"/api/v1/runs/{run_id}/decisions",
        headers=_auth(token),
        json={"decisions": decisions},
    )
    assert saved.status_code == 200
    assert saved.json()["status"] == "READY_TO_BUILD"

    built = await client.post(f"/api/v1/runs/{run_id}/build", headers=_auth(token))
    assert built.status_code == 200
    body = built.json()
    assert body["run"]["status"] == "VERIFIED"
    assert body["dataset"]["status"] == "VERIFIED"
    assert body["dataset"]["output_location"].startswith("staging://")
    assert len(body["verifier_results"]) >= 3
    assert all(r["status"] == "PASSED" for r in body["verifier_results"])
    names = {r["check_name"] for r in body["verifier_results"]}
    assert "policy_complete" in names
    blob = str(body["verifier_results"]).lower()
    assert "sample" not in blob
    assert "password" not in blob


@pytest.mark.asyncio
async def test_create_run_ai_scan_path(client, monkeypatch):
    """When ENABLE_AI_SCAN is on, create_run uses scanner (mocked) not stub."""
    from src.config import get_settings

    monkeypatch.setenv("ENABLE_AI_SCAN", "true")
    monkeypatch.setenv(
        "SOURCE_DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/mydatabase",
    )
    get_settings.cache_clear()

    async def fake_scan(_url: str, **_kwargs):
        return [
            {
                "source_path": "customers",
                "field_path": "phone",
                "data_type": "varchar",
                "profile_summary": "mocked scan",
                "classification": "PERSONAL_BASIC",
                "taxonomy_id": "PHONE",
                "detector_source": "rule",
                "coverage_status": "full",
                "recommended_action": "MASK",
            }
        ]

    monkeypatch.setattr(
        "src.services.run_scanner.scan_postgres_source",
        fake_scan,
    )

    token = await _login(client, "dpo", "dpo123")
    created = await client.post(
        "/api/v1/runs",
        headers=_auth(token),
        json={"source_id": "sql-demo"},
    )
    get_settings.cache_clear()
    assert created.status_code == 201
    data = created.json()
    assert data["status"] == "REVIEW_REQUIRED"
    assert len(data["field_profiles"]) == 1
    profile = data["field_profiles"][0]
    assert profile["coverage_status"] == "full"
    assert profile["taxonomy_id"] == "PHONE"
    assert profile["field_path"] == "phone"
    assert "sample" not in str(data).lower()


@pytest.mark.asyncio
async def test_create_run_ai_scan_failure_marks_failed(client, monkeypatch):
    from src.config import get_settings

    monkeypatch.setenv("ENABLE_AI_SCAN", "true")
    monkeypatch.setenv(
        "SOURCE_DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/mydatabase",
    )
    get_settings.cache_clear()

    async def boom(_url: str, **_kwargs):
        raise RuntimeError("connector down")

    monkeypatch.setattr(
        "src.services.run_scanner.scan_postgres_source",
        boom,
    )

    token = await _login(client, "dpo", "dpo123")
    created = await client.post(
        "/api/v1/runs",
        headers=_auth(token),
        json={"source_id": "sql-demo"},
    )
    get_settings.cache_clear()
    assert created.status_code == 201
    assert created.json()["status"] == "FAILED"
    assert created.json()["field_profiles"] == []
