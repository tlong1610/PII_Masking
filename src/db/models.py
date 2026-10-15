"""ORM models for PIIGuard app metadata (no raw PII values)."""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.base import Base


class DemoUser(Base):
    """Demo login accounts — role is assigned by the server, never by the client."""

    __tablename__ = "demo_users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    # Demo-only plaintext password; not for production auth.
    password: Mapped[str] = mapped_column(String(128), nullable=False)
    role: Mapped[str] = mapped_column(String(16), nullable=False)  # DPO | ANALYST


class DataSource(Base):
    """User-registered source database. The connection URL is stored only encrypted."""

    __tablename__ = "data_sources"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    source_type: Mapped[str] = mapped_column(String(16), nullable=False)  # SQL | NOSQL
    engine: Mapped[str] = mapped_column(String(64), nullable=False)  # postgresql | mongodb
    encrypted_url: Mapped[str] = mapped_column(Text, nullable=False)
    # Postgres schema or Mongo database name
    namespace: Mapped[str] = mapped_column(String(128), nullable=False, default="")
    scan_tables: Mapped[str] = mapped_column(Text, nullable=False, default="")  # comma-separated allowlist
    host_hint: Mapped[str] = mapped_column(String(256), nullable=False, default="")  # masked, no credentials
    created_by: Mapped[int] = mapped_column(ForeignKey("demo_users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Run(Base):
    __tablename__ = "runs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    source_id: Mapped[str] = mapped_column(String(64), nullable=False)
    source_type: Mapped[str] = mapped_column(String(16), nullable=False)  # SQL | NOSQL
    source_name: Mapped[str] = mapped_column(String(128), nullable=False)
    engine: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="NEW")
    created_by: Mapped[int] = mapped_column(ForeignKey("demo_users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    source_manifest_version: Mapped[str] = mapped_column(String(32), nullable=False, default="v1")
    policy_version: Mapped[str] = mapped_column(String(32), nullable=False, default="v1")

    field_profiles: Mapped[list["FieldProfile"]] = relationship(back_populates="run")
    field_decisions: Mapped[list["FieldDecision"]] = relationship(back_populates="run")
    decision_history: Mapped[list["FieldDecisionHistory"]] = relationship(
        back_populates="run", cascade="all, delete-orphan", order_by="FieldDecisionHistory.id"
    )
    datasets: Mapped[list["Dataset"]] = relationship(back_populates="run")


class FieldProfile(Base):
    __tablename__ = "field_profiles"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    run_id: Mapped[int] = mapped_column(ForeignKey("runs.id"), nullable=False, index=True)
    source_path: Mapped[str] = mapped_column(String(256), nullable=False)
    field_path: Mapped[str] = mapped_column(String(256), nullable=False)
    data_type: Mapped[str] = mapped_column(String(64), nullable=False)
    profile_summary: Mapped[str] = mapped_column(Text, nullable=False, default="")
    classification: Mapped[str] = mapped_column(String(64), nullable=False, default="UNKNOWN")
    taxonomy_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    detector_source: Mapped[str] = mapped_column(String(32), nullable=False, default="unknown")
    coverage_status: Mapped[str] = mapped_column(String(32), nullable=False, default="partial")
    recommended_action: Mapped[str] = mapped_column(String(16), nullable=False, default="DROP")
    # Confidence (0-1) of the detector tier that decided: rule, BM25, hybrid or LLM; None for stubs/keys
    confidence_score: Mapped[float | None] = mapped_column(Float, nullable=True)

    run: Mapped["Run"] = relationship(back_populates="field_profiles")
    decisions: Mapped[list["FieldDecision"]] = relationship(back_populates="field_profile")


class FieldDecision(Base):
    __tablename__ = "field_decisions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    run_id: Mapped[int] = mapped_column(ForeignKey("runs.id"), nullable=False, index=True)
    field_profile_id: Mapped[int] = mapped_column(ForeignKey("field_profiles.id"), nullable=False)
    action: Mapped[str] = mapped_column(String(16), nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False, default="")
    decided_by: Mapped[int] = mapped_column(ForeignKey("demo_users.id"), nullable=False)
    decided_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    decision_version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    is_exception: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    exception_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    run: Mapped["Run"] = relationship(back_populates="field_decisions")
    field_profile: Mapped["FieldProfile"] = relationship(back_populates="decisions")


class FieldDecisionHistory(Base):
    """Immutable audit trail of field decision versions and changes (before / after)."""

    __tablename__ = "field_decision_history"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    run_id: Mapped[int] = mapped_column(ForeignKey("runs.id"), nullable=False, index=True)
    field_profile_id: Mapped[int] = mapped_column(ForeignKey("field_profiles.id"), nullable=False, index=True)
    from_action: Mapped[str | None] = mapped_column(String(16), nullable=True)
    to_action: Mapped[str] = mapped_column(String(16), nullable=False)
    from_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    to_reason: Mapped[str] = mapped_column(Text, nullable=False, default="")
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    decided_by: Mapped[int] = mapped_column(ForeignKey("demo_users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    is_exception: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    exception_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    run: Mapped["Run"] = relationship(back_populates="decision_history")
    field_profile: Mapped["FieldProfile"] = relationship()


class Dataset(Base):
    __tablename__ = "datasets"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    run_id: Mapped[int] = mapped_column(ForeignKey("runs.id"), nullable=False, index=True)
    dataset_name: Mapped[str] = mapped_column(String(128), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="STAGING")
    output_location: Mapped[str] = mapped_column(String(512), nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    run: Mapped["Run"] = relationship(back_populates="datasets")
    verifier_results: Mapped[list["VerifierResult"]] = relationship(back_populates="dataset")


class VerifierResult(Base):
    """Downstream / policy check results for a dataset (aggregate values only, no raw PII)."""

    __tablename__ = "verifier_results"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    dataset_id: Mapped[int] = mapped_column(ForeignKey("datasets.id"), nullable=False, index=True)
    check_name: Mapped[str] = mapped_column(String(128), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False)  # PASSED | FAILED
    baseline_value: Mapped[str] = mapped_column(String(128), nullable=False, default="")
    actual_value: Mapped[str] = mapped_column(String(128), nullable=False, default="")
    tolerance: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    details: Mapped[str] = mapped_column(Text, nullable=False, default="")

    dataset: Mapped["Dataset"] = relationship(back_populates="verifier_results")


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    actor_id: Mapped[int] = mapped_column(ForeignKey("demo_users.id"), nullable=False)
    role: Mapped[str] = mapped_column(String(16), nullable=False)
    action: Mapped[str] = mapped_column(String(64), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(64), nullable=False)
    entity_id: Mapped[str] = mapped_column(String(64), nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    prev_hash: Mapped[str] = mapped_column(String(64), nullable=False, default="0" * 64)
    entry_hash: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    request_id: Mapped[str | None] = mapped_column(String(64), nullable=True, default=None)
    client_ip: Mapped[str | None] = mapped_column(String(64), nullable=True, default=None)


class VaultToken(Base):
    """Encrypted token vault storage using AES-256-GCM (§9.5, FR-13)."""

    __tablename__ = "vault_tokens"
    __table_args__ = (UniqueConstraint("blind_index", "entity_type", name="uq_vault_tokens_blind_entity"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    token: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    encrypted_value: Mapped[str] = mapped_column(Text, nullable=False)
    blind_index: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    key_version: Mapped[str] = mapped_column(String(32), nullable=False, default="v1")
    entity_type: Mapped[str] = mapped_column(String(64), nullable=False, default="PII")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())



class DatasetGrant(Base):
    """User entitlement grant for a published dataset (§3, §14.2)."""

    __tablename__ = "dataset_grants"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    dataset_id: Mapped[int] = mapped_column(ForeignKey("datasets.id"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("demo_users.id"), nullable=False, index=True)
    granted_by: Mapped[int] = mapped_column(ForeignKey("demo_users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    dataset: Mapped["Dataset"] = relationship(backref="grants")
    user: Mapped["DemoUser"] = relationship(foreign_keys=[user_id])
    grantor: Mapped["DemoUser"] = relationship(foreign_keys=[granted_by])

