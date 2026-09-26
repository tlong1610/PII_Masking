"""Run scan / review / build API — DPO only; no raw PII in responses."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from src.api.deps import require_dpo
from src.api.session_store import SessionUser
from src.api.sources import get_source_by_id
from src.db import models as db_models
from src.db.session import get_db
from src.models.schemas import (
    BuildResponse,
    DatasetOut,
    DatasetStatus,
    DetectorSource,
    FieldDecisionOut,
    FieldDecisionsUpdate,
    FieldProfileOut,
    PolicyAction,
    RunCreate,
    RunOut,
    RunStatus,
    SourceType,
)

router = APIRouter(tags=["runs"])


def _stub_field_specs(source_type: SourceType) -> list[dict]:
    """Metadata-only stub profiles (no sample/raw values)."""
    if source_type == SourceType.SQL:
        path = "customers"
        fields = [
            ("customer_id", "varchar", "NON_PERSONAL", "rule", PolicyAction.HMAC, "Join key"),
            ("full_name", "varchar", "PERSONAL_BASIC", "rule", PolicyAction.MASK, "Name-like"),
            ("phone", "varchar", "PERSONAL_BASIC", "rule", PolicyAction.MASK, "Phone pattern"),
            ("email", "varchar", "PERSONAL_BASIC", "ai", PolicyAction.MASK, "Email-like"),
            ("notes", "text", "UNKNOWN", "unknown", PolicyAction.DROP, "Ambiguous free text"),
        ]
    else:
        path = "customers"
        fields = [
            ("_id", "objectId", "NON_PERSONAL", "rule", PolicyAction.KEEP, "Document id"),
            ("customer_id", "string", "NON_PERSONAL", "rule", PolicyAction.HMAC, "Join key"),
            ("full_name", "string", "PERSONAL_BASIC", "rule", PolicyAction.MASK, "Name-like"),
            ("phone", "string", "PERSONAL_BASIC", "rule", PolicyAction.MASK, "Phone pattern"),
            ("notes", "string", "UNKNOWN", "unknown", PolicyAction.DROP, "Ambiguous free text"),
        ]
    specs = []
    for field_path, data_type, classification, detector, action, summary in fields:
        specs.append(
            {
                "source_path": path,
                "field_path": field_path,
                "data_type": data_type,
                "profile_summary": summary,
                "classification": classification,
                "taxonomy_id": None if classification == "UNKNOWN" else classification,
                "detector_source": detector,
                "coverage_status": "stub",
                "recommended_action": action.value,
            }
        )
    return specs


def _write_audit(
    db: Session,
    *,
    actor: SessionUser,
    action: str,
    entity_type: str,
    entity_id: str,
    reason: str = "",
) -> None:
    db.add(
        db_models.AuditEvent(
            actor_id=actor.id,
            role=actor.role,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            reason=reason,
        )
    )


def _load_run(db: Session, run_id: int) -> db_models.Run | None:
    return db.scalar(
        select(db_models.Run)
        .where(db_models.Run.id == run_id)
        .options(
            selectinload(db_models.Run.field_profiles),
            selectinload(db_models.Run.field_decisions),
            selectinload(db_models.Run.datasets),
        )
    )


def _run_to_out(run: db_models.Run) -> RunOut:
    return RunOut(
        id=run.id,
        source_id=run.source_id,
        source_type=SourceType(run.source_type),
        source_name=run.source_name,
        engine=run.engine,
        status=RunStatus(run.status),
        created_by=run.created_by,
        source_manifest_version=run.source_manifest_version,
        policy_version=run.policy_version,
        field_profiles=[
            FieldProfileOut(
                id=p.id,
                source_path=p.source_path,
                field_path=p.field_path,
                data_type=p.data_type,
                profile_summary=p.profile_summary,
                classification=p.classification,
                taxonomy_id=p.taxonomy_id,
                detector_source=DetectorSource(p.detector_source),
                coverage_status=p.coverage_status,
                recommended_action=PolicyAction(p.recommended_action),
            )
            for p in run.field_profiles
        ],
        field_decisions=[
            FieldDecisionOut(
                id=d.id,
                field_profile_id=d.field_profile_id,
                action=PolicyAction(d.action),
                reason=d.reason,
                decided_by=d.decided_by,
                decision_version=d.decision_version,
            )
            for d in run.field_decisions
        ],
        datasets=[
            DatasetOut(
                id=ds.id,
                run_id=ds.run_id,
                dataset_name=ds.dataset_name,
                status=DatasetStatus(ds.status),
                output_location=ds.output_location,
            )
            for ds in run.datasets
        ],
    )


@router.post("/runs", response_model=RunOut, status_code=status.HTTP_201_CREATED)
def create_run(
    body: RunCreate,
    user: SessionUser = Depends(require_dpo),
    db: Session = Depends(get_db),
) -> RunOut:
    source = get_source_by_id(body.source_id)
    if source is None:
        raise HTTPException(status_code=404, detail="Unknown source_id")

    run = db_models.Run(
        source_id=source.id,
        source_type=source.source_type.value,
        source_name=source.name,
        engine=source.engine,
        status=RunStatus.SCANNING.value,
        created_by=user.id,
    )
    db.add(run)
    db.flush()

    for spec in _stub_field_specs(source.source_type):
        db.add(db_models.FieldProfile(run_id=run.id, **spec))

    run.status = RunStatus.REVIEW_REQUIRED.value
    _write_audit(
        db,
        actor=user,
        action="create_run",
        entity_type="run",
        entity_id=str(run.id),
        reason=f"source={source.id}",
    )
    db.commit()

    loaded = _load_run(db, run.id)
    assert loaded is not None
    return _run_to_out(loaded)


@router.get("/runs/{run_id}", response_model=RunOut)
def get_run(
    run_id: int,
    _user: SessionUser = Depends(require_dpo),
    db: Session = Depends(get_db),
) -> RunOut:
    run = _load_run(db, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found")
    return _run_to_out(run)


@router.put("/runs/{run_id}/decisions", response_model=RunOut)
def put_decisions(
    run_id: int,
    body: FieldDecisionsUpdate,
    user: SessionUser = Depends(require_dpo),
    db: Session = Depends(get_db),
) -> RunOut:
    run = _load_run(db, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found")

    profiles_by_id = {p.id: p for p in run.field_profiles}
    for item in body.decisions:
        profile = profiles_by_id.get(item.field_profile_id)
        if profile is None:
            raise HTTPException(
                status_code=400,
                detail=f"field_profile_id {item.field_profile_id} not in run",
            )
        if profile.classification == "UNKNOWN" and item.action == PolicyAction.KEEP:
            raise HTTPException(
                status_code=422,
                detail="UNKNOWN fields cannot be KEEP; use DROP or a justified classification",
            )

    # Replace decisions for submitted field_profile_ids (upsert by profile id).
    existing = {d.field_profile_id: d for d in run.field_decisions}
    for item in body.decisions:
        if item.field_profile_id in existing:
            row = existing[item.field_profile_id]
            row.action = item.action.value
            row.reason = item.reason
            row.decided_by = user.id
            row.decision_version += 1
        else:
            db.add(
                db_models.FieldDecision(
                    run_id=run.id,
                    field_profile_id=item.field_profile_id,
                    action=item.action.value,
                    reason=item.reason,
                    decided_by=user.id,
                    decision_version=1,
                )
            )

    db.flush()
    db.refresh(run)
    run = _load_run(db, run_id)
    assert run is not None

    decided_ids = {d.field_profile_id for d in run.field_decisions}
    all_ids = {p.id for p in run.field_profiles}
    if decided_ids == all_ids:
        run.status = RunStatus.READY_TO_BUILD.value
    else:
        run.status = RunStatus.REVIEW_REQUIRED.value

    _write_audit(
        db,
        actor=user,
        action="save_decisions",
        entity_type="run",
        entity_id=str(run.id),
        reason=f"count={len(body.decisions)}",
    )
    db.commit()
    loaded = _load_run(db, run_id)
    assert loaded is not None
    return _run_to_out(loaded)


@router.post("/runs/{run_id}/build", response_model=BuildResponse)
def build_run(
    run_id: int,
    user: SessionUser = Depends(require_dpo),
    db: Session = Depends(get_db),
) -> BuildResponse:
    run = _load_run(db, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found")

    profile_ids = {p.id for p in run.field_profiles}
    decided_ids = {d.field_profile_id for d in run.field_decisions}
    missing = sorted(profile_ids - decided_ids)
    if missing:
        raise HTTPException(
            status_code=422,
            detail={
                "message": "Build blocked: every field must have a decision",
                "missing_field_profile_ids": missing,
            },
        )

    for d in run.field_decisions:
        profile = next(p for p in run.field_profiles if p.id == d.field_profile_id)
        if profile.classification == "UNKNOWN" and d.action == PolicyAction.KEEP.value:
            raise HTTPException(
                status_code=422,
                detail="Build blocked: UNKNOWN cannot KEEP",
            )

    # Failed prior datasets must not become readable; stub succeeds to VERIFIED.
    run.status = RunStatus.BUILDING.value
    db.flush()

    dataset = db_models.Dataset(
        run_id=run.id,
        dataset_name=f"run-{run.id}-snapshot",
        status=DatasetStatus.STAGING.value,
        output_location=f"staging://run/{run.id}/snapshot",
    )
    db.add(dataset)
    db.flush()

    # Skeleton: mark verified without real transform/verifier (datasets-api will publish).
    dataset.status = DatasetStatus.VERIFIED.value
    run.status = RunStatus.VERIFIED.value
    _write_audit(
        db,
        actor=user,
        action="build_run",
        entity_type="dataset",
        entity_id=str(dataset.id),
        reason="stub build -> VERIFIED",
    )
    db.commit()

    loaded = _load_run(db, run_id)
    assert loaded is not None
    ds_out = next(ds for ds in _run_to_out(loaded).datasets if ds.id == dataset.id)
    return BuildResponse(run=_run_to_out(loaded), dataset=ds_out)
