from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # App
    app_name: str = "AI20K Agent"
    app_env: Literal["development", "production", "test"] = "development"
    seed_demo_users: bool = False
    # Built-in "SQL demo" / "NoSQL demo" sources backed by the server's own .env databases.
    # Off by default: a real deployment only shows databases the DPO registered. Tests and the
    # local QA stack turn it on to scan the seeded Docker databases.
    enable_demo_sources: bool = False
    # Analysts get a read-only Postgres login to the published datasets in the snapshot store.
    enable_analyst_sql: bool = False
    # Public address of the snapshot server shown to Analysts (Render: the external hostname);
    # empty = the host/port of SNAPSHOT_DATABASE_URL.
    analyst_sql_host: str = ""
    analyst_sql_port: int = 0
    analyst_sql_sslmode: str = "require"
    app_port: int = Field(default=8000, ge=1, le=65535)
    app_host: str = "0.0.0.0"
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"
    cors_origins: str = "http://localhost:3000,http://localhost:5173"

    # LLM Configuration
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    anthropic_api_key: str = ""
    google_api_key: str = ""
    groq_api_key: str = ""
    openrouter_api_key: str = ""
    cerebras_api_key: str = ""
    model_name: str = "gpt-4o-mini"
    llm_temperature: float = Field(default=0.7, ge=0.0, le=2.0)

    # Database (app metadata)
    database_url: str = "sqlite:///./data/app.db"

    # Postgres source (read-only fixture) vs snapshot target (write protected copy)
    source_database_url: str = ""
    snapshot_database_url: str = ""
    enable_pg_snapshot: bool = False
    snapshot_schema: str = "piiguard_snapshot"
    pg_schema: str = "public"
    # Comma-separated table allowlist for scan + snapshot; empty = every table in pg_schema
    pg_scan_tables: str = ""
    # Wire LangGraph PII scan into POST /runs (off = stub profiles for tests)
    enable_ai_scan: bool = False
    # Columns scanned in parallel by the AI scan (each waits on one LLM call); lower it on rate limits
    scan_concurrency: int = Field(default=4, ge=1, le=32)
    # Free-text NER (REDACT action): regex tier always runs; the GLiNER model tier needs ENABLE_NER=true
    # plus the gliner package installed (falls back to regex-only when unavailable).
    enable_ner: bool = False
    ner_model_name: str = "urchade/gliner_multi_pii-v1"
    # Optional JSON {entity_type: [keywords]} for the dictionary tier (e.g. known customer names)
    ner_dictionary_path: str = ""
    # DPO corrections saved as few-shot examples for the LLM tier (runtime file, not committed)
    hitl_memory_path: str = "./data/hitl/dpo_few_shot_memory.json"

    # MongoDB source (read-only) and protected snapshot database on the same cluster
    mongo_uri: str = ""
    mongo_source_uri: str = ""
    mongo_db: str = "mydatabase"
    mongo_snapshot_db: str = "mydatabase_protected"
    enable_mongo: bool = False

    # User-supplied source connection strings are stored encrypted (Fernet key, urlsafe base64)
    source_encryption_key: str = ""
    # Dev default: allow loopback/private hosts; set false in production to block SSRF-style targets
    allow_private_source_hosts: bool = True
    # HMAC join-key hashing (not encryption)
    hmac_secret: str = "dev-hmac-secret-change-me"
    hmac_key_version: str = "v1"

    # Vault (§9.5, FR-13)
    vault_encryption_key: str = ""
    vault_blind_key: str = ""
    vault_key_version: str = "v1"
    vault_rate_limit_per_minute: int = 10

    # Authentication Rate Limiting (§4.1, P2)
    auth_rate_limit_per_minute: int = 60

    # Governance & Separation of Duties (§3, §17.4)
    self_approval_allowed: bool = True

    # Vector Store
    chroma_persist_dir: str = "./data/chroma"
    pinecone_api_key: str = ""
    pinecone_environment: str = ""

    # LangSmith (AI Logs)
    langchain_api_key: str = ""
    langchain_project: str = "ai20k-agent"
    langchain_tracing_v2: str = "false"


@lru_cache
def get_settings() -> Settings:
    return Settings()
