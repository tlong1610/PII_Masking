"""AI wiring in the API: DPO corrections feed the LLM few-shot memory, orchestrator risk = /risk-score."""

import json

import pytest

from src.config import get_settings
from src.detection.hitl_feedback import get_few_shot_examples, save_few_shot_example


async def _login(client, username: str, password: str) -> str:
    response = await client.post("/api/v1/sessions", json={"username": username, "password": password})
    assert response.status_code == 200
    return response.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _decisions(profiles: list[dict], overrides: dict[str, str]) -> list[dict]:
    out = []
    for p in profiles:
        action = overrides.get(p["field_path"], p["recommended_action"])
        item = {"field_profile_id": p["id"], "action": action, "is_exception": False}
        if action != p["recommended_action"]:
            item["reason"] = "DPO điều chỉnh"
        out.append(item)
    return out


@pytest.fixture
def hitl_memory(tmp_path, monkeypatch):
    path = tmp_path / "memory.json"
    monkeypatch.setattr(get_settings(), "hitl_memory_path", str(path))
    return path


@pytest.mark.asyncio
async def test_dpo_overrides_are_saved_as_few_shot_examples(client, hitl_memory, monkeypatch):
    monkeypatch.setattr(get_settings(), "enable_ai_scan", True)
    token = await _login(client, "dpo", "dpo123")
    run = (await client.post("/api/v1/runs", headers=_auth(token), json={"source_id": "sql-demo"})).json()

    res = await client.put(
        f"/api/v1/runs/{run['id']}/decisions",
        headers=_auth(token),
        json={"decisions": _decisions(run["field_profiles"], {"notes": "MASK"})},
    )
    assert res.status_code == 200

    saved = json.loads(hitl_memory.read_text(encoding="utf-8"))
    # Only the overridden field is learned; accepted proposals are not corrections.
    assert saved == [
        {
            "column_name": "notes",
            "table_name": "customers",
            "data_shape": [],
            "dpo_decision": "UNKNOWN",
            "action": "MASK",
        }
    ]


@pytest.mark.asyncio
async def test_no_learning_when_ai_scan_is_off(client, hitl_memory):
    token = await _login(client, "dpo", "dpo123")
    run = (await client.post("/api/v1/runs", headers=_auth(token), json={"source_id": "sql-demo"})).json()
    res = await client.put(
        f"/api/v1/runs/{run['id']}/decisions",
        headers=_auth(token),
        json={"decisions": _decisions(run["field_profiles"], {"notes": "MASK"})},
    )
    assert res.status_code == 200
    assert not hitl_memory.exists()


def test_few_shot_memory_replaces_and_ranks_by_relevance(hitl_memory):
    save_few_shot_example("so_tai_khoan", [], "BANK_ACCOUNT", "KEEP", table_name="bank")
    save_few_shot_example("so_tai_khoan", [], "BANK_ACCOUNT", "MASK", table_name="bank")
    save_few_shot_example("ship_city", [], "CITY", "KEEP", table_name="orders")

    saved = json.loads(hitl_memory.read_text(encoding="utf-8"))
    assert [(e["column_name"], e["action"]) for e in saved] == [("so_tai_khoan", "MASK"), ("ship_city", "KEEP")]

    best = get_few_shot_examples(limit=1, column_name="tai_khoan_nhan")
    assert best[0]["column_name"] == "so_tai_khoan"


@pytest.mark.asyncio
async def test_orchestrator_risk_matches_risk_score_endpoint(client):
    token = await _login(client, "dpo", "dpo123")
    run = (await client.post("/api/v1/runs", headers=_auth(token), json={"source_id": "sql-demo"})).json()
    put = await client.put(
        f"/api/v1/runs/{run['id']}/decisions",
        headers=_auth(token),
        json={"decisions": _decisions(run["field_profiles"], {})},
    )
    assert put.status_code == 200

    orchestrated = (await client.post(f"/api/v1/runs/{run['id']}/orchestrate", headers=_auth(token))).json()
    risk = (await client.get(f"/api/v1/runs/{run['id']}/risk-score", headers=_auth(token))).json()
    assert orchestrated["risk"]["score"] == risk["score"]
    assert orchestrated["risk"]["tier"] == risk["tier"]


@pytest.mark.asyncio
async def test_run_exposes_confidence_score_field(client):
    token = await _login(client, "dpo", "dpo123")
    run = (await client.post("/api/v1/runs", headers=_auth(token), json={"source_id": "sql-demo"})).json()
    # Stub profiles carry no detector confidence; the field is still part of the contract.
    assert all("confidence_score" in p and p["confidence_score"] is None for p in run["field_profiles"])


def test_init_db_adds_missing_columns(tmp_path):
    from sqlalchemy import create_engine, inspect, text

    from src.db.session import _add_missing_columns

    engine = create_engine(f"sqlite:///{tmp_path / 'old.db'}")
    with engine.begin() as conn:
        conn.execute(text("CREATE TABLE field_profiles (id INTEGER PRIMARY KEY, field_path VARCHAR(256))"))
    _add_missing_columns(engine)
    _add_missing_columns(engine)  # idempotent
    columns = {c["name"] for c in inspect(engine).get_columns("field_profiles")}
    assert "confidence_score" in columns
