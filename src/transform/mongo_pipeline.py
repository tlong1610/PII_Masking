"""Orchestrate MongoDB protected snapshot build + $lookup verification from DPO decisions."""

from __future__ import annotations

from typing import Any

JOIN_SAFE_ACTIONS = frozenset({"KEEP", "HMAC"})


def actions_from_run_decisions(profiles: list, decisions: list) -> dict[str, dict[str, str]]:
    """collection -> dot_path -> action, from ORM rows or simple namespaces."""
    by_id = {p.id: p for p in profiles}
    out: dict[str, dict[str, str]] = {}
    for d in decisions:
        p = by_id.get(d.field_profile_id)
        if p is None:
            continue
        out.setdefault(p.source_path, {})[p.field_path] = d.action
    return out


def join_key_violations(
    table_actions: dict[str, dict[str, str]],
    relations: list[tuple[str, str, str, str]],
) -> list[dict[str, str]]:
    """Both ends of a join must share one action in {KEEP, HMAC}, otherwise $lookup breaks."""
    violations: list[dict[str, str]] = []
    for from_coll, from_field, to_coll, to_field in relations:
        from_action = table_actions.get(from_coll, {}).get(from_field, "KEEP").upper()
        to_action = table_actions.get(to_coll, {}).get(to_field, "KEEP").upper()
        if from_action == to_action and from_action in JOIN_SAFE_ACTIONS:
            continue
        violations.append(
            {
                "from": f"{from_coll}.{from_field}",
                "from_action": from_action,
                "to": f"{to_coll}.{to_field}",
                "to_action": to_action,
            }
        )
    return violations


def run_protected_mongo_pipeline(
    *,
    uri: str,
    source_db: str,
    snapshot_db: str,
    secret: str,
    key_version: str,
    table_actions: dict[str, dict[str, str]],
    relations: list[tuple[str, str, str, str]],
    client: Any | None = None,
    default_action: str = "KEEP",
) -> tuple[dict[str, int], list[dict[str, str]]]:
    """Build snapshot_db from source_db per table_actions, then compare $lookup counts.

    default_action applies to document fields missing from table_actions.
    """
    from src.verifier.mongo_verifier import HMACHasher, MongoVerifier

    if source_db == snapshot_db:
        raise ValueError("Mongo snapshot database must differ from the source database")

    verifier = MongoVerifier(
        connection_string=uri,
        source_db_name=source_db,
        target_db_name=snapshot_db,
        hasher=HMACHasher(secret_key=secret, key_version=key_version),
        client=client,
    )
    index_fields: dict[str, list[str]] = {}
    for from_coll, from_field, to_coll, to_field in relations:
        index_fields.setdefault(from_coll, []).append(from_field)
        if to_field != "_id":
            index_fields.setdefault(to_coll, []).append(to_field)

    written = verifier.build_snapshot_from_actions(
        table_actions, index_fields=index_fields, default_action=default_action
    )
    checks = verifier.verify_snapshot(sorted(written), relations)
    return written, checks
