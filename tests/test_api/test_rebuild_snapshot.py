"""One run, one dataset: saving again rebuilds it in place until it is published.

Confirms:
1. Building twice keeps the same dataset id and replaces its verifier results.
2. New decisions on a VERIFIED run make its dataset STAGING, which cannot be published.
3. A run whose verifier FAILED can be revised and rebuilt.
4. Revoking a published dataset reopens the run: revise, rebuild and republish the same dataset.
5. A run that failed during the scan (no dataset) or was cancelled stays blocked.
"""

import pytest
from sqlalchemy import select

from src.db import models as db_models
from src.db.session import get_session_factory
from src.models.schemas import DatasetStatus, RunStatus


async def _login(client, username: str, password: str) -> str:
    response = await client.post(
        "/api/v1/sessions",
        json={"username": username, "password": password},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


async def _ready_run(client, token: str) -> dict:
    """A sql-demo run with a decision on every field (READY_TO_BUILD)."""
    created = await client.post("/api/v1/runs", headers=_auth(token), json={"source_id": "sql-demo"})
    assert created.status_code == 201
    run = created.json()
    decisions = [
        {
            "field_profile_id": p["id"],
            "action": "DROP" if p["classification"] == "UNKNOWN" else p["recommended_action"],
            "reason": "initial review",
        }
        for p in run["field_profiles"]
    ]
    saved = await client.put(f"/api/v1/runs/{run['id']}/decisions", headers=_auth(token), json={"decisions": decisions})
    assert saved.status_code == 200
    assert saved.json()["status"] == "READY_TO_BUILD"
    return run


async def _revise(client, token: str, run: dict, action: str = "DROP"):
    field = run["field_profiles"][0]
    return await client.put(
        f"/api/v1/runs/{run['id']}/decisions",
        headers=_auth(token),
        json={"decisions": [{"field_profile_id": field["id"], "action": action, "reason": "revised"}]},
    )


def _set_status(run_id: int, run_status: RunStatus, dataset_status: DatasetStatus | None = None) -> None:
    with get_session_factory()() as db:
        run = db.scalar(select(db_models.Run).where(db_models.Run.id == run_id))
        run.status = run_status.value
        if dataset_status is not None:
            for dataset in db.scalars(select(db_models.Dataset).where(db_models.Dataset.run_id == run_id)):
                dataset.status = dataset_status.value
        db.commit()


def _verifier_ids(dataset_id: int) -> set[int]:
    with get_session_factory()() as db:
        rows = db.scalars(select(db_models.VerifierResult).where(db_models.VerifierResult.dataset_id == dataset_id))
        return {row.id for row in rows}


@pytest.mark.asyncio
async def test_rebuild_keeps_the_same_dataset(client):
    token = await _login(client, "dpo", "dpo123")
    run = await _ready_run(client, token)

    first = await client.post(f"/api/v1/runs/{run['id']}/build", headers=_auth(token))
    assert first.status_code == 200
    dataset_id = first.json()["dataset"]["id"]
    first_checks = _verifier_ids(dataset_id)
    assert first_checks

    second = await client.post(f"/api/v1/runs/{run['id']}/build", headers=_auth(token))
    assert second.status_code == 200
    body = second.json()
    assert body["run"]["status"] == "VERIFIED"
    assert body["dataset"]["id"] == dataset_id
    assert body["dataset"]["status"] == "VERIFIED"
    assert [ds["id"] for ds in body["run"]["datasets"]] == [dataset_id]
    # The old checks are replaced, not appended to.
    assert len(_verifier_ids(dataset_id)) == len(first_checks)


@pytest.mark.asyncio
async def test_revised_decisions_block_publishing_until_rebuilt(client):
    token = await _login(client, "dpo", "dpo123")
    run = await _ready_run(client, token)
    built = await client.post(f"/api/v1/runs/{run['id']}/build", headers=_auth(token))
    dataset_id = built.json()["dataset"]["id"]

    revised = await _revise(client, token, run)
    assert revised.status_code == 200
    assert revised.json()["status"] == "READY_TO_BUILD"
    assert revised.json()["datasets"][0]["status"] == "STAGING"

    stale_publish = await client.post(f"/api/v1/datasets/{dataset_id}/publish", headers=_auth(token))
    assert stale_publish.status_code == 422

    rebuilt = await client.post(f"/api/v1/runs/{run['id']}/build", headers=_auth(token))
    assert rebuilt.json()["dataset"]["id"] == dataset_id
    published = await client.post(f"/api/v1/datasets/{dataset_id}/publish", headers=_auth(token))
    assert published.status_code == 200


@pytest.mark.asyncio
async def test_rebuild_after_verifier_failed(client):
    token = await _login(client, "dpo", "dpo123")
    run = await _ready_run(client, token)
    built = await client.post(f"/api/v1/runs/{run['id']}/build", headers=_auth(token))
    assert built.status_code == 200
    _set_status(run["id"], RunStatus.FAILED, DatasetStatus.FAILED)

    revised = await _revise(client, token, run)
    assert revised.status_code == 200
    assert revised.json()["status"] == "READY_TO_BUILD"

    rebuilt = await client.post(f"/api/v1/runs/{run['id']}/build", headers=_auth(token))
    assert rebuilt.status_code == 200
    assert rebuilt.json()["run"]["status"] == "VERIFIED"


@pytest.mark.asyncio
async def test_revoke_reopens_the_run_for_republishing(client):
    token = await _login(client, "dpo", "dpo123")
    run = await _ready_run(client, token)
    built = await client.post(f"/api/v1/runs/{run['id']}/build", headers=_auth(token))
    dataset_id = built.json()["dataset"]["id"]
    assert (await client.post(f"/api/v1/datasets/{dataset_id}/publish", headers=_auth(token))).status_code == 200

    assert (await _revise(client, token, run)).status_code == 422

    revoked = await client.post(f"/api/v1/datasets/{dataset_id}/revoke", headers=_auth(token))
    assert revoked.status_code == 200
    assert revoked.json()["status"] == "REVOKED"
    reopened = await client.get(f"/api/v1/runs/{run['id']}", headers=_auth(token))
    assert reopened.json()["status"] == "READY_TO_BUILD"

    assert (await _revise(client, token, run)).status_code == 200
    rebuilt = await client.post(f"/api/v1/runs/{run['id']}/build", headers=_auth(token))
    assert rebuilt.status_code == 200
    assert rebuilt.json()["dataset"]["id"] == dataset_id
    assert rebuilt.json()["dataset"]["status"] == "VERIFIED"
    assert (await client.post(f"/api/v1/datasets/{dataset_id}/publish", headers=_auth(token))).status_code == 200


@pytest.mark.asyncio
@pytest.mark.parametrize("blocked_status", [RunStatus.FAILED, RunStatus.CANCELLED])
async def test_rebuild_blocked_without_dataset(client, blocked_status):
    """FAILED during the scan (nothing built yet) and CANCELLED runs cannot be revised or built."""
    token = await _login(client, "dpo", "dpo123")
    run = await _ready_run(client, token)
    _set_status(run["id"], blocked_status)

    build = await client.post(f"/api/v1/runs/{run['id']}/build", headers=_auth(token))
    assert build.status_code == 422
    assert (await _revise(client, token, run)).status_code == 422
