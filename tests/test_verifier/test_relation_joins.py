"""Generic JOIN verifier for user Postgres sources (connections faked; no live DB)."""

import pytest

from src.verifier import sql_verifier

RELATION = ("user_roles", "user_id", "users", "id")


class _Cursor:
    def __init__(self, conn):
        self.conn = conn

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def execute(self, query):
        result = self.conn.results.pop(0)
        if isinstance(result, Exception):
            raise result
        self.row = {"n": result}

    def fetchone(self):
        return self.row


class _Conn:
    def __init__(self, results):
        self.results = list(results)
        self.rolled_back = False

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def cursor(self):
        return _Cursor(self)

    def rollback(self):
        self.rolled_back = True


@pytest.fixture
def fake_dbs(monkeypatch):
    conns: dict[str, _Conn] = {}
    monkeypatch.setattr(sql_verifier, "_connect", lambda url: conns[url])
    return conns


def _run(relations):
    return sql_verifier.verify_relation_joins(
        "src", "snap", source_schema="public", snapshot_schema="snap_run1", relations=relations
    )


def test_join_preserved_passes(fake_dbs):
    fake_dbs.update(src=_Conn([30]), snap=_Conn([30]))
    [check] = _run([RELATION])
    assert check.status == "PASSED"
    assert check.check_name == "join_matched:user_roles.user_id->users.id"
    assert (check.baseline_value, check.actual_value) == ("matched=30", "matched=30")


def test_mismatched_protection_breaks_join_and_fails(fake_dbs):
    # One end HMAC, the other KEEP: nothing matches in the snapshot anymore.
    fake_dbs.update(src=_Conn([30]), snap=_Conn([0]))
    [check] = _run([RELATION])
    assert check.status == "FAILED"
    assert check.actual_value == "matched=0"


def test_dropped_join_column_fails_without_raising(fake_dbs):
    snap = _Conn([RuntimeError("column does not exist")])
    fake_dbs.update(src=_Conn([30]), snap=snap)
    [check] = _run([RELATION])
    assert check.status == "FAILED"
    assert check.actual_value == "error"
    assert snap.rolled_back


def test_no_relations_skips_connecting(fake_dbs):
    assert _run([]) == []
