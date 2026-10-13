"""DPO management endpoints: run history, dataset detail/filters, users, audit filters, scope joins."""

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


async def _create_run(client, dpo_token: str) -> dict:
    created = await client.post("/api/v1/runs", headers=_auth(dpo_token), json={"source_id": "sql-demo"})
    assert created.status_code == 201
    return created.json()


async def _build_verified_dataset(client, dpo_token: str) -> tuple[dict, dict]:
    run = await _create_run(client, dpo_token)
    decisions = [
        {
            "field_profile_id": p["id"],
            "action": "DROP" if p["classification"] == "UNKNOWN" else p["recommended_action"],
            "reason": "ok",
        }
        for p in run["field_profiles"]
    ]
    saved = await client.put(
        f"/api/v1/runs/{run['id']}/decisions", headers=_auth(dpo_token), json={"decisions": decisions}
    )
    assert saved.status_code == 200
    built = await client.post(f"/api/v1/runs/{run['id']}/build", headers=_auth(dpo_token))
    assert built.status_code == 200
    return run, built.json()["dataset"]


@pytest.mark.asyncio
async def test_list_runs_is_dpo_only(client):
    analyst = await _login(client, "analyst", "analyst123")
    response = await client.get("/api/v1/runs", headers=_auth(analyst))
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_list_runs_returns_summaries_newest_first(client):
    dpo = await _login(client, "dpo", "dpo123")
    first = await _create_run(client, dpo)
    second = await _create_run(client, dpo)

    response = await client.get("/api/v1/runs", headers=_auth(dpo))
    assert response.status_code == 200
    runs = response.json()
    ids = [r["id"] for r in runs]
    assert ids.index(second["id"]) < ids.index(first["id"])

    summary = next(r for r in runs if r["id"] == second["id"])
    assert summary["status"] == "REVIEW_REQUIRED"
    assert summary["created_by_username"] == "dpo"
    assert summary["field_count"] == len(second["field_profiles"])
    assert summary["pii_field_count"] == sum(
        1 for p in second["field_profiles"] if p["classification"] not in {"UNKNOWN", "NON_PERSONAL"}
    )
    assert summary["decided_count"] == 0
    assert summary["latest_dataset_id"] is None
    # Summary rows carry counts only — never field profiles or values.
    assert "field_profiles" not in summary


@pytest.mark.asyncio
async def test_list_runs_filters_by_status(client):
    dpo = await _login(client, "dpo", "dpo123")
    run, dataset = await _build_verified_dataset(client, dpo)

    verified = await client.get("/api/v1/runs?status=VERIFIED", headers=_auth(dpo))
    assert verified.status_code == 200
    assert all(r["status"] == "VERIFIED" for r in verified.json())
    row = next(r for r in verified.json() if r["id"] == run["id"])
    assert row["latest_dataset_id"] == dataset["id"]
    assert row["latest_dataset_status"] == "VERIFIED"
    assert row["decided_count"] == len(run["field_profiles"])

    review = await client.get("/api/v1/runs?status=REVIEW_REQUIRED", headers=_auth(dpo))
    assert run["id"] not in {r["id"] for r in review.json()}


@pytest.mark.asyncio
async def test_datasets_list_has_metadata_and_status_filter(client):
    dpo = await _login(client, "dpo", "dpo123")
    _, dataset = await _build_verified_dataset(client, dpo)

    verified = await client.get("/api/v1/datasets?status=VERIFIED", headers=_auth(dpo))
    assert verified.status_code == 200
    assert all(d["status"] == "VERIFIED" for d in verified.json())
    row = next(d for d in verified.json() if d["id"] == dataset["id"])
    assert row["created_at"] is not None
    assert row["published_at"] is None
    assert row["source_id"] == "sql-demo"
    assert row["source_name"]
    assert row["grant_count"] == 0

    published = await client.post(f"/api/v1/datasets/{dataset['id']}/publish", headers=_auth(dpo))
    assert published.status_code == 200
    after = await client.get("/api/v1/datasets?status=PUBLISHED", headers=_auth(dpo))
    row = next(d for d in after.json() if d["id"] == dataset["id"])
    assert row["published_at"] is not None
    assert row["grant_count"] >= 1


@pytest.mark.asyncio
async def test_dataset_detail_includes_verifier_and_action_counts(client):
    dpo = await _login(client, "dpo", "dpo123")
    analyst = await _login(client, "analyst", "analyst123")
    run, dataset = await _build_verified_dataset(client, dpo)

    forbidden = await client.get(f"/api/v1/datasets/{dataset['id']}", headers=_auth(analyst))
    assert forbidden.status_code == 403

    response = await client.get(f"/api/v1/datasets/{dataset['id']}", headers=_auth(dpo))
    assert response.status_code == 200
    detail = response.json()
    assert detail["run_status"] == "VERIFIED"
    assert isinstance(detail["verifier_results"], list)
    assert sum(detail["action_counts"].values()) == len(run["field_profiles"])
    assert set(detail["action_counts"]) <= {"MASK", "HMAC", "KEEP", "DROP"}

    missing = await client.get("/api/v1/datasets/999999", headers=_auth(dpo))
    assert missing.status_code == 404


@pytest.mark.asyncio
async def test_users_endpoint_lists_analysts_without_secrets(client):
    dpo = await _login(client, "dpo", "dpo123")
    analyst = await _login(client, "analyst", "analyst123")

    assert (await client.get("/api/v1/users", headers=_auth(analyst))).status_code == 403

    response = await client.get("/api/v1/users?role=ANALYST", headers=_auth(dpo))
    assert response.status_code == 200
    users = response.json()
    assert users and all(u["role"] == "ANALYST" for u in users)
    assert "analyst" in {u["username"] for u in users}
    assert all(set(u) == {"id", "username", "role"} for u in users)


@pytest.mark.asyncio
async def test_grants_include_username(client):
    dpo = await _login(client, "dpo", "dpo123")
    _, dataset = await _build_verified_dataset(client, dpo)
    users = (await client.get("/api/v1/users?role=ANALYST", headers=_auth(dpo))).json()
    analyst_id = next(u["id"] for u in users if u["username"] == "analyst")

    granted = await client.post(
        f"/api/v1/datasets/{dataset['id']}/grants", headers=_auth(dpo), json={"user_id": analyst_id}
    )
    assert granted.status_code == 201
    assert granted.json()["username"] == "analyst"

    grants = await client.get(f"/api/v1/datasets/{dataset['id']}/grants", headers=_auth(dpo))
    assert [g["username"] for g in grants.json()] == ["analyst"]


@pytest.mark.asyncio
async def test_audit_filters_by_entity_id_and_names_actor(client):
    dpo = await _login(client, "dpo", "dpo123")
    run = await _create_run(client, dpo)
    await _create_run(client, dpo)

    response = await client.get(
        f"/api/v1/audit?entity_type=run&entity_id={run['id']}", headers=_auth(dpo)
    )
    assert response.status_code == 200
    events = response.json()
    assert events
    assert all(e["entity_type"] == "run" and e["entity_id"] == str(run["id"]) for e in events)
    assert all(e["actor_username"] == "dpo" for e in events)


@pytest.mark.asyncio
async def test_stub_scope_returns_relationships(client):
    dpo = await _login(client, "dpo", "dpo123")
    response = await client.get("/api/v1/sources/sql-demo/scope", headers=_auth(dpo))
    assert response.status_code == 200
    relationships = response.json()["relationships"]
    assert {
        "source_table": "orders",
        "source_column": "customer_id",
        "target_table": "customers",
        "target_column": "customer_id",
    } in relationships


@pytest.mark.asyncio
async def test_risk_score_flags_estimated_volume_for_stub(client):
    dpo = await _login(client, "dpo", "dpo123")
    run = await _create_run(client, dpo)
    response = await client.get(f"/api/v1/runs/{run['id']}/risk-score", headers=_auth(dpo))
    assert response.status_code == 200
    body = response.json()
    assert body["row_count_estimated"] is True
    assert body["drivers"]["row_count"] == 5000


@pytest.mark.asyncio
async def test_delete_run_removes_metadata_but_keeps_audit(client):
    dpo = await _login(client, "dpo", "dpo123")
    run = await _create_run(client, dpo)

    deleted = await client.delete(f"/api/v1/runs/{run['id']}", headers=_auth(dpo))
    assert deleted.status_code == 204
    assert (await client.get(f"/api/v1/runs/{run['id']}", headers=_auth(dpo))).status_code == 404
    assert run["id"] not in {r["id"] for r in (await client.get("/api/v1/runs", headers=_auth(dpo))).json()}

    events = (
        await client.get(f"/api/v1/audit?entity_type=run&entity_id={run['id']}", headers=_auth(dpo))
    ).json()
    assert {"create_run", "delete_run"} <= {e["action"] for e in events}
    assert (await client.get("/api/v1/audit/verify", headers=_auth(dpo))).json()["valid"] is True


@pytest.mark.asyncio
async def test_delete_run_blocked_while_snapshot_exists(client):
    dpo = await _login(client, "dpo", "dpo123")
    run, dataset = await _build_verified_dataset(client, dpo)

    blocked = await client.delete(f"/api/v1/runs/{run['id']}", headers=_auth(dpo))
    assert blocked.status_code == 409
    assert f"#{dataset['id']}" in blocked.json()["detail"]

    assert (await client.post(f"/api/v1/datasets/{dataset['id']}/revoke", headers=_auth(dpo))).status_code == 200
    assert (await client.delete(f"/api/v1/runs/{run['id']}", headers=_auth(dpo))).status_code == 204
    assert (await client.get(f"/api/v1/datasets/{dataset['id']}", headers=_auth(dpo))).status_code == 404


@pytest.mark.asyncio
async def test_delete_run_is_dpo_only_and_404_for_unknown(client):
    dpo = await _login(client, "dpo", "dpo123")
    analyst = await _login(client, "analyst", "analyst123")
    run = await _create_run(client, dpo)

    assert (await client.delete(f"/api/v1/runs/{run['id']}", headers=_auth(analyst))).status_code == 403
    assert (await client.delete("/api/v1/runs/999999", headers=_auth(dpo))).status_code == 404


@pytest.mark.asyncio
async def test_preview_reports_verifier_outcome_to_analyst(client):
    dpo = await _login(client, "dpo", "dpo123")
    analyst = await _login(client, "analyst", "analyst123")
    _, dataset = await _build_verified_dataset(client, dpo)
    await client.post(f"/api/v1/datasets/{dataset['id']}/publish", headers=_auth(dpo))

    preview = (await client.get(f"/api/v1/datasets/{dataset['id']}/preview", headers=_auth(analyst))).json()
    detail = (await client.get(f"/api/v1/datasets/{dataset['id']}", headers=_auth(dpo))).json()
    results = detail["verifier_results"]
    assert preview["verification"] == {
        "passed": sum(1 for r in results if r["status"] == "PASSED"),
        "total": len(results),
    }
