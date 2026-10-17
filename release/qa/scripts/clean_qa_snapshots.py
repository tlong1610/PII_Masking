"""Drop the snapshot schemas / Mongo DBs written by QA runs (names start with the QA prefixes only).

Run from the repo root: PYTHONPATH=. .venv/bin/python release/qa/scripts/clean_qa_snapshots.py
"""

from __future__ import annotations

import psycopg
from pymongo import MongoClient

from src.config import get_settings

PG_PREFIX = "piiguard_qa_snapshot"
MONGO_PREFIX = "mydatabase_qa_protected"


def main() -> None:
    settings = get_settings()
    with psycopg.connect(settings.snapshot_database_url, autocommit=True) as conn:
        schemas = [
            r[0]
            for r in conn.execute(
                "SELECT nspname FROM pg_namespace WHERE nspname = %s OR nspname LIKE %s",
                (PG_PREFIX, f"{PG_PREFIX}_run%"),
            )
        ]
        for schema in schemas:
            conn.execute(f'DROP SCHEMA IF EXISTS "{schema}" CASCADE')
    dropped_mongo = []
    uri = settings.mongo_uri or settings.mongo_source_uri
    if uri:
        client = MongoClient(uri, serverSelectionTimeoutMS=3000)
        for name in client.list_database_names():
            if name.startswith(MONGO_PREFIX):
                client.drop_database(name)
                dropped_mongo.append(name)
        client.close()
    print(f"dropped postgres schemas: {schemas}; mongo dbs: {dropped_mongo}")


if __name__ == "__main__":
    main()
