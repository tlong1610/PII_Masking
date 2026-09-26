"""ORM models for PIIGuard app metadata (no raw PII values)."""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
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

    run: Mapped["Run"] = relationship(back_populates="field_decisions")
    field_profile: Mapped["FieldProfile"] = relationship(back_populates="decisions")


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
