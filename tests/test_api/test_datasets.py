"""Tests for datasets publish / revoke / list / preview guardrails."""

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


async def _build_verified_dataset(client, dpo_token: str, build_body: dict | None = None) -> dict:
    created = await client.post(
        "/api/v1/runs",
        headers=_auth(dpo_token),
        json={"source_id": "sql-demo"},
    )
    assert created.status_code == 201
    run = created.json()
    decisions = []
    for p in run["field_profiles"]:
        action = "DROP" if p["classification"] == "UNKNOWN" else p["recommended_action"]
        decisions.append(
            {"field_profile_id": p["id"], "action": action, "reason": "ok"}
        )
    saved = await client.put(
        f"/api/v1/runs/{run['id']}/decisions",
        headers=_auth(dpo_token),
        json={"decisions": decisions},
    )
    assert saved.status_code == 200
    built = await client.post(
        f"/api/v1/runs/{run['id']}/build",
        headers=_auth(dpo_token),
        json=build_body,
    )
    assert built.status_code == 200
    return built.json()["dataset"]


@pytest.mark.asyncio
async def test_publish_requires_verified(client):
    dpo = await _login(client, "dpo", "dpo123")
    # Create STAGING-like by building then manually we only have VERIFIED from stub.
    # Reject publish of non-existent and verify 422 path via forging status:
    # Build yields VERIFIED; create another run and don't build — no dataset.
    # Use verified then revoke? Better: publish when VERIFIED works; test 422 by
    # publishing twice after revoke won't work. Insert FAILED via second approach:
    ds = await _build_verified_dataset(client, dpo)
    # Force status via revoke then try publish
    revoked = await client.post(
        f"/api/v1/datasets/{ds['id']}/revoke",
        headers=_auth(dpo),
    )
    assert revoked.status_code == 200
    assert revoked.json()["status"] == "REVOKED"
    again = await client.post(
        f"/api/v1/datasets/{ds['id']}/publish",
        headers=_auth(dpo),
    )
    assert again.status_code == 422


@pytest.mark.asyncio
async def test_publish_verified_and_analyst_list_filter(client):
    dpo = await _login(client, "dpo", "dpo123")
    analyst = await _login(client, "analyst", "analyst123")
    ds = await _build_verified_dataset(client, dpo)

    before = await client.get("/api/v1/datasets", headers=_auth(analyst))
    assert before.status_code == 200
    assert all(item["status"] == "PUBLISHED" for item in before.json())
    assert ds["id"] not in {item["id"] for item in before.json()}

    published = await client.post(
        f"/api/v1/datasets/{ds['id']}/publish",
        headers=_auth(dpo),
    )
    assert published.status_code == 200
    assert published.json()["status"] == "PUBLISHED"

    after = await client.get("/api/v1/datasets", headers=_auth(analyst))
    ids = {item["id"] for item in after.json()}
    assert ds["id"] in ids
    assert all(item["status"] == "PUBLISHED" for item in after.json())

    dpo_list = await client.get("/api/v1/datasets", headers=_auth(dpo))
    assert dpo_list.status_code == 200
    assert any(item["id"] == ds["id"] for item in dpo_list.json())


@pytest.mark.asyncio
async def test_analyst_cannot_publish(client):
    dpo = await _login(client, "dpo", "dpo123")
    analyst = await _login(client, "analyst", "analyst123")
    ds = await _build_verified_dataset(client, dpo)
    response = await client.post(
        f"/api/v1/datasets/{ds['id']}/publish",
        headers=_auth(analyst),
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_analyst_cannot_preview_unverified(client):
    dpo = await _login(client, "dpo", "dpo123")
    analyst = await _login(client, "analyst", "analyst123")
    ds = await _build_verified_dataset(client, dpo)

    blocked = await client.get(
        f"/api/v1/datasets/{ds['id']}/preview",
        headers=_auth(analyst),
    )
    assert blocked.status_code == 403

    await client.post(f"/api/v1/datasets/{ds['id']}/publish", headers=_auth(dpo))
    preview = await client.get(
        f"/api/v1/datasets/{ds['id']}/preview",
        headers=_auth(analyst),
    )
    assert preview.status_code == 200
    body = preview.json()
    blob = str(body).lower()
    assert "sample" not in blob
    assert "password" not in blob
    assert "[redacted]" in blob or "hmac_stub_" in blob
    for col in body["columns"]:
        assert col["transform"] in ("MASK", "HMAC", "KEEP", "DROPPED")


@pytest.mark.asyncio
async def test_revoke_hides_from_analyst(client):
    dpo = await _login(client, "dpo", "dpo123")
    analyst = await _login(client, "analyst", "analyst123")
    ds = await _build_verified_dataset(client, dpo)
    await client.post(f"/api/v1/datasets/{ds['id']}/publish", headers=_auth(dpo))
    await client.post(f"/api/v1/datasets/{ds['id']}/revoke", headers=_auth(dpo))

    listed = await client.get("/api/v1/datasets", headers=_auth(analyst))
    assert ds["id"] not in {item["id"] for item in listed.json()}

    preview = await client.get(
        f"/api/v1/datasets/{ds['id']}/preview",
        headers=_auth(analyst),
    )
    assert preview.status_code == 403


@pytest.mark.asyncio
async def test_revoke_physical_rollback_and_grant_deletion(client):
    """Kiểm tra đặc tả FR-08: Revoke phải thực hiện rollback thật:
    - Xóa toàn bộ quyền truy cập (DatasetGrant) của Analyst đối với dataset này.
    - Đánh dấu output_location là REVOKED_AND_DROPPED.
    """
    dpo = await _login(client, "dpo", "dpo123")
    ds = await _build_verified_dataset(client, dpo)
    ds_id = ds["id"]

    # 1. Publish dataset (tự động tạo grant cho Analyst theo §14.2)
    pub_res = await client.post(f"/api/v1/datasets/{ds_id}/publish", headers=_auth(dpo))
    assert pub_res.status_code == 200

    # Kiểm tra grants tồn tại sau publish
    grants_before = await client.get(f"/api/v1/datasets/{ds_id}/grants", headers=_auth(dpo))
    assert grants_before.status_code == 200
    assert len(grants_before.json()) > 0

    # 2. DPO gọi Revoke (FR-08)
    revoke_res = await client.post(f"/api/v1/datasets/{ds_id}/revoke", headers=_auth(dpo))
    assert revoke_res.status_code == 200
    revoked_ds = revoke_res.json()
    assert revoked_ds["status"] == "REVOKED"
    assert "REVOKED_AND_DROPPED" in revoked_ds["output_location"]

    # 3. Kiểm tra các quyền cấp cho Analyst đã bị xóa sạch (Rollback quyền hoàn toàn)
    grants_after = await client.get(f"/api/v1/datasets/{ds_id}/grants", headers=_auth(dpo))
    assert len(grants_after.json()) == 0




@pytest.mark.asyncio
async def test_publish_keeps_snapshot_location(client):
    """Publish must not overwrite the physical snapshot location (preview/revoke depend on it)."""
    dpo = await _login(client, "dpo", "dpo123")
    ds = await _build_verified_dataset(client, dpo)
    published = await client.post(f"/api/v1/datasets/{ds['id']}/publish", headers=_auth(dpo))
    assert published.status_code == 200
    assert published.json()["status"] == "PUBLISHED"
    assert published.json()["output_location"] == ds["output_location"]
    assert not published.json()["output_location"].startswith("published://")


@pytest.mark.asyncio
async def test_preview_lists_tables_and_respects_table_and_limit(client):
    dpo = await _login(client, "dpo", "dpo123")
    analyst = await _login(client, "analyst", "analyst123")
    ds = await _build_verified_dataset(client, dpo)
    await client.post(f"/api/v1/datasets/{ds['id']}/publish", headers=_auth(dpo))

    preview = await client.get(f"/api/v1/datasets/{ds['id']}/preview", headers=_auth(analyst))
    assert preview.status_code == 200
    body = preview.json()
    assert body["tables"]
    assert body["selected_table"] == body["tables"][0]
    assert body["rows"]
    dropped = {c["name"] for c in body["columns"] if c["transform"] == "DROPPED"}
    for row in body["rows"]:
        assert not dropped & set(row)

    one = await client.get(
        f"/api/v1/datasets/{ds['id']}/preview",
        params={"table": body["tables"][0], "limit": 1},
        headers=_auth(analyst),
    )
    assert one.status_code == 200
    assert len(one.json()["rows"]) == 1

    missing = await client.get(
        f"/api/v1/datasets/{ds['id']}/preview",
        params={"table": "not_a_table"},
        headers=_auth(analyst),
    )
    assert missing.status_code == 404

    too_many = await client.get(
        f"/api/v1/datasets/{ds['id']}/preview",
        params={"limit": 10_000},
        headers=_auth(analyst),
    )
    assert too_many.status_code == 422


@pytest.mark.asyncio
async def test_export_zip_holds_every_table_with_protected_columns_only(client):
    import csv
    import io
    import zipfile

    dpo = await _login(client, "dpo", "dpo123")
    analyst = await _login(client, "analyst", "analyst123")
    ds = await _build_verified_dataset(client, dpo)
    await client.post(f"/api/v1/datasets/{ds['id']}/publish", headers=_auth(dpo))
    preview = (await client.get(f"/api/v1/datasets/{ds['id']}/preview", headers=_auth(analyst))).json()

    exported = await client.get(f"/api/v1/datasets/{ds['id']}/export", headers=_auth(analyst))
    assert exported.status_code == 200
    assert exported.headers["content-type"] == "application/zip"
    assert exported.headers["content-disposition"].endswith('.zip"')
    with zipfile.ZipFile(io.BytesIO(exported.content)) as zf:
        assert sorted(zf.namelist()) == sorted(f"{t}.csv" for t in preview["tables"])
        for table in preview["tables"]:
            text = zf.read(f"{table}.csv").decode("utf-8-sig")
            header = next(csv.reader(io.StringIO(text)))
            expected = [
                c["name"] for c in preview["columns"] if c["source_path"] == table and c["transform"] != "DROPPED"
            ]
            assert header == expected

    one = await client.get(
        f"/api/v1/datasets/{ds['id']}/export", params={"table": preview["tables"][0]}, headers=_auth(analyst)
    )
    assert one.status_code == 200
    assert one.headers["content-type"].startswith("text/csv")

    missing = await client.get(
        f"/api/v1/datasets/{ds['id']}/export", params={"table": "not_a_table"}, headers=_auth(analyst)
    )
    assert missing.status_code == 404

    audit = await client.get("/api/v1/audit", headers=_auth(dpo))
    assert audit.status_code == 200
    assert any(e["action"] == "export_dataset" for e in audit.json())


@pytest.mark.asyncio
async def test_export_follows_preview_access_rules(client):
    dpo = await _login(client, "dpo", "dpo123")
    analyst = await _login(client, "analyst", "analyst123")
    ds = await _build_verified_dataset(client, dpo)

    unpublished = await client.get(f"/api/v1/datasets/{ds['id']}/export", headers=_auth(analyst))
    assert unpublished.status_code == 403

    await client.post(f"/api/v1/datasets/{ds['id']}/publish", headers=_auth(dpo))
    me = (await client.get("/api/v1/me", headers=_auth(analyst))).json()
    removed = await client.delete(f"/api/v1/datasets/{ds['id']}/grants/{me['id']}", headers=_auth(dpo))
    assert removed.status_code == 204
    no_grant = await client.get(f"/api/v1/datasets/{ds['id']}/export", headers=_auth(analyst))
    assert no_grant.status_code == 403

    anonymous = await client.get(f"/api/v1/datasets/{ds['id']}/export")
    assert anonymous.status_code == 401


@pytest.mark.asyncio
async def test_dpo_names_the_dataset_on_save_and_a_rebuild_keeps_it(client):
    dpo = await _login(client, "dpo", "dpo123")
    ds = await _build_verified_dataset(client, dpo, {"dataset_name": "  Khách hàng   & đơn hàng Q3 "})
    assert ds["dataset_name"] == "Khách hàng & đơn hàng Q3"

    rebuilt = await client.post(f"/api/v1/runs/{ds['run_id']}/build", headers=_auth(dpo))
    assert rebuilt.status_code == 200
    assert rebuilt.json()["dataset"]["dataset_name"] == "Khách hàng & đơn hàng Q3"


@pytest.mark.asyncio
async def test_build_without_a_name_keeps_the_default(client):
    dpo = await _login(client, "dpo", "dpo123")
    ds = await _build_verified_dataset(client, dpo)
    assert ds["dataset_name"] == f"run-{ds['run_id']}-snapshot"


@pytest.mark.asyncio
async def test_published_dataset_can_be_renamed_by_dpo_only(client):
    dpo = await _login(client, "dpo", "dpo123")
    analyst = await _login(client, "analyst", "analyst123")
    ds = await _build_verified_dataset(client, dpo)
    assert (await client.post(f"/api/v1/datasets/{ds['id']}/publish", headers=_auth(dpo))).status_code == 200

    denied = await client.patch(
        f"/api/v1/datasets/{ds['id']}", headers=_auth(analyst), json={"dataset_name": "x"}
    )
    assert denied.status_code == 403
    blank = await client.patch(f"/api/v1/datasets/{ds['id']}", headers=_auth(dpo), json={"dataset_name": "   "})
    assert blank.status_code == 422

    renamed = await client.patch(
        f"/api/v1/datasets/{ds['id']}", headers=_auth(dpo), json={"dataset_name": "Doanh thu theo khách"}
    )
    assert renamed.status_code == 200
    assert renamed.json()["status"] == "PUBLISHED"

    listed = await client.get("/api/v1/datasets", headers=_auth(analyst))
    assert [d["dataset_name"] for d in listed.json() if d["id"] == ds["id"]] == ["Doanh thu theo khách"]
    export = await client.get(f"/api/v1/datasets/{ds['id']}/export", headers=_auth(analyst))
    assert 'filename="doanh-thu-theo-khach.zip"' in export.headers["content-disposition"]
