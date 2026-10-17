"""Audit list filters and display context used by the activity log screen."""

import pytest


async def _login(client, username: str, password: str) -> str:
    response = await client.post("/api/v1/sessions", json={"username": username, "password": password})
    assert response.status_code == 200
    return response.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


async def _built_run(client, token: str) -> dict:
    run = (await client.post("/api/v1/runs", headers=_auth(token), json={"source_id": "sql-demo"})).json()
    decisions = [
        {
            "field_profile_id": p["id"],
            "action": "DROP" if p["classification"] == "UNKNOWN" else p["recommended_action"],
            "reason": "review",
        }
        for p in run["field_profiles"]
    ]
    await client.put(f"/api/v1/runs/{run['id']}/decisions", headers=_auth(token), json={"decisions": decisions})
    build = await client.post(f"/api/v1/runs/{run['id']}/build", headers=_auth(token))
    assert build.status_code == 200
    return build.json()


@pytest.mark.asyncio
async def test_run_filter_includes_its_dataset_events(client):
    token = await _login(client, "dpo", "dpo123")
    built = await _built_run(client, token)
    run_id = built["run"]["id"]

    events = (await client.get(f"/api/v1/audit?run_id={run_id}", headers=_auth(token))).json()
    actions = {e["action"] for e in events}
    assert {"create_run", "save_decisions", "build_run"} <= actions
    assert all(e["run_id"] == run_id for e in events)
    build_event = next(e for e in events if e["action"] == "build_run")
    assert build_event["entity_type"] == "dataset"
    assert build_event["source_name"] == built["run"]["source_name"]


@pytest.mark.asyncio
async def test_actions_filter_keeps_only_listed_actions(client):
    token = await _login(client, "dpo", "dpo123")
    await _built_run(client, token)

    events = (await client.get("/api/v1/audit?actions=create_run,build_run", headers=_auth(token))).json()
    assert events
    assert {e["action"] for e in events} <= {"create_run", "build_run"}

    logins = (await client.get("/api/v1/audit?actions=login", headers=_auth(token))).json()
    assert logins and all(e["run_id"] is None and e["source_name"] is None for e in logins)
