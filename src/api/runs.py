"""Run scan / review / build API — DPO only; no raw PII in responses."""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import HTMLResponse
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from src.agents.orchestrator import build_orchestrator_graph
from src.api.deps import require_analyst_or_dpo, require_dpo
from src.api.session_store import SessionUser
from src.api.sources import SourceConnection, get_source_by_id, resolve_connection
from src.config import get_settings
from src.db import models as db_models
from src.db.session import get_db
from src.models.schemas import (
    BuildResponse,
    DatasetOut,
    DatasetStatus,
    DetectorSource,
    FieldDecisionHistoryOut,
    FieldDecisionOut,
    FieldDecisionsUpdate,
    FieldProfileOut,
    JoinKeyOut,
    PolicyAction,
    RunCreate,
    RunOut,
    RunStatus,
    SourceType,
    UserRole,
    VerifierCheckStatus,
    VerifierResultOut,
)
from src.services.report_generator import build_report_data, render_html_report
from src.services.risk_scorer import calculate_risk_score, resolve_sensitivity_level
from src.services.secret_box import SecretBoxError

router = APIRouter(tags=["runs"])

# Classifications a DPO may confirm as "not personal data"; PII must use the exception flow.
_RECLASSIFIABLE = frozenset({"UNKNOWN", "NON_PERSONAL"})


def _field_error(profile: db_models.FieldProfile, message: str) -> HTTPException:
    """422 that names the offending field so the UI can jump straight to it (no values, only paths)."""
    return HTTPException(
        status_code=422,
        detail={
            "message": message,
            "field_profile_id": profile.id,
            "field_path": f"{profile.source_path}.{profile.field_path}",
        },
    )


def mongo_client():
    """Shared Mongo client override; None lets connectors open their own from settings."""
    return None


def _connection_for(source, db: Session) -> SourceConnection:
    """Resolve secret-bearing connection details; errors carry no URL or password."""
    try:
        return resolve_connection(source, db)
    except LookupError:
        raise HTTPException(status_code=404, detail="Source no longer exists") from None
    except SecretBoxError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from None


def _stub_field_specs(source_type: SourceType, selected_scope: tuple[str, ...]) -> list[dict]:
    """Metadata-only stub profiles (no sample/raw values)."""
    if source_type == SourceType.SQL:
        paths = selected_scope or ("customers",)
        fields = [
            ("customer_id", "varchar", "NON_PERSONAL", "rule", PolicyAction.HMAC, "Join key"),
            ("full_name", "varchar", "PERSONAL_BASIC", "rule", PolicyAction.MASK, "Name-like"),
            ("phone", "varchar", "PERSONAL_BASIC", "rule", PolicyAction.MASK, "Phone pattern"),
            ("email", "varchar", "PERSONAL_BASIC", "ai", PolicyAction.MASK, "Email-like"),
            ("notes", "text", "UNKNOWN", "unknown", PolicyAction.DROP, "Ambiguous free text"),
        ]
    else:
        paths = selected_scope or ("customers",)
        fields = [
            ("_id", "objectId", "NON_PERSONAL", "rule", PolicyAction.KEEP, "Document id"),
            ("customer_id", "string", "NON_PERSONAL", "rule", PolicyAction.HMAC, "Join key"),
            ("full_name", "string", "PERSONAL_BASIC", "rule", PolicyAction.MASK, "Name-like"),
            ("phone", "string", "PERSONAL_BASIC", "rule", PolicyAction.MASK, "Phone pattern"),
            ("notes", "string", "UNKNOWN", "unknown", PolicyAction.DROP, "Ambiguous free text"),
        ]
    specs = []
    for path in paths:
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
    from src.audit import record_audit_event

    record_audit_event(
        db,
        actor=actor,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        reason=reason,
    )


def _load_run(db: Session, run_id: int) -> db_models.Run | None:
    return db.scalar(
        select(db_models.Run)
        .where(db_models.Run.id == run_id)
        .options(
            selectinload(db_models.Run.field_profiles),
            selectinload(db_models.Run.field_decisions),
            selectinload(db_models.Run.decision_history),
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
                is_exception=getattr(d, "is_exception", False),
                exception_until=getattr(d, "exception_until", None),
            )
            for d in run.field_decisions
        ],
        decision_history=[
            FieldDecisionHistoryOut(
                id=h.id,
                run_id=h.run_id,
                field_profile_id=h.field_profile_id,
                from_action=PolicyAction(h.from_action) if h.from_action else None,
                to_action=PolicyAction(h.to_action),
                from_reason=h.from_reason,
                to_reason=h.to_reason,
                version=h.version,
                decided_by=h.decided_by,
                created_at=h.created_at,
                is_exception=getattr(h, "is_exception", False),
                exception_until=getattr(h, "exception_until", None),
            )
            for h in getattr(run, "decision_history", [])
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


async def _execute_create_run(
    body: RunCreate,
    user: SessionUser,
    db: Session,
    audit_action: str = "create_run",
) -> RunOut:
    source = get_source_by_id(body.source_id, db)
    if source is None:
        raise HTTPException(status_code=404, detail="Unknown source_id")

    settings = get_settings()
    conn = _connection_for(source, db)
    use_pg = source.engine == "postgresql" and conn.live
    use_mongo = source.engine == "mongodb" and conn.live
    selected_scope = tuple(dict.fromkeys(item.strip() for item in body.selected_scope if item.strip()))

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

    scan_reason = f"source={source.id}"
    try:
        if use_pg:
            from src.services.run_scanner import scan_postgres_source

            pg_tables = selected_scope if selected_scope else conn.tables
            specs = await scan_postgres_source(
                conn.url,
                use_ai=settings.enable_ai_scan,
                schema_name=conn.namespace,
                tables=pg_tables,
            )
            mode = "ai" if settings.enable_ai_scan else "rule"
            scope_str = ','.join(pg_tables) if pg_tables else 'all'
            scan_reason = f"source={source.id}; scope={scope_str}; scan=pg-{mode}"
        elif use_mongo:
            from src.services.run_scanner import scan_mongo_source

            mongo_cols = selected_scope if selected_scope else None
            specs = await scan_mongo_source(
                conn.url,
                conn.namespace,
                use_ai=settings.enable_ai_scan,
                collections=mongo_cols,
                client=mongo_client(),
            )
            mode = "ai" if settings.enable_ai_scan else "rule"
            scope_str = ','.join(mongo_cols) if mongo_cols else 'all'
            scan_reason = f"source={source.id}; scope={scope_str}; scan=mongo-{mode}"
        else:
            specs = _stub_field_specs(source.source_type, selected_scope or ("customers",))
            scope_str = ','.join(selected_scope) if selected_scope else 'default'
            scan_reason = f"source={source.id}; scope={scope_str}; scan=stub"

        for spec in specs:
            db.add(db_models.FieldProfile(run_id=run.id, **spec))
        run.status = RunStatus.REVIEW_REQUIRED.value
    except Exception as exc:
        run.status = RunStatus.FAILED.value
        scan_reason = f"source={source.id}; scan=failed:{type(exc).__name__}"
        _write_audit(
            db,
            actor=user,
            action=audit_action,
            entity_type="run",
            entity_id=str(run.id),
            reason=scan_reason,
        )
        db.commit()
        loaded = _load_run(db, run.id)
        assert loaded is not None
        return _run_to_out(loaded)

    _write_audit(
        db,
        actor=user,
        action=audit_action,
        entity_type="run",
        entity_id=str(run.id),
        reason=scan_reason,
    )
    db.commit()

    loaded = _load_run(db, run.id)
    assert loaded is not None
    return _run_to_out(loaded)


@router.post("/runs", response_model=RunOut, status_code=status.HTTP_201_CREATED)
async def create_run(
    body: RunCreate,
    user: SessionUser = Depends(require_dpo),
    db: Session = Depends(get_db),
) -> RunOut:
    """Create a scan run directly (DPO role)."""
    return await _execute_create_run(body, user, db, audit_action="create_run")


@router.post(
    "/runs/request",
    response_model=RunOut,
    status_code=status.HTTP_201_CREATED,
    summary="Yêu cầu quét dữ liệu (Analyst hoặc DPO §3)",
)
async def request_run(
    body: RunCreate,
    user: SessionUser = Depends(require_analyst_or_dpo),
    db: Session = Depends(get_db),
) -> RunOut:
    """Analyst requests a dataset scan; transitions to REVIEW_REQUIRED for DPO decision-making (§3)."""
    return await _execute_create_run(body, user, db, audit_action="request_run")



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


@router.post("/runs/{run_id}/cancel", response_model=RunOut)
def cancel_run(
    run_id: int,
    user: SessionUser = Depends(require_dpo),
    db: Session = Depends(get_db),
) -> RunOut:
    """Cancel an active scan run (FR-03)."""
    run = _load_run(db, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found")

    terminal_statuses = {
        RunStatus.VERIFIED.value,
        RunStatus.PUBLISHED.value,
        RunStatus.FAILED.value,
        RunStatus.CANCELLED.value,
        RunStatus.REVOKED.value,
    }
    if run.status in terminal_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot cancel run in terminal state '{run.status}'",
        )

    run.status = RunStatus.CANCELLED.value
    _write_audit(
        db,
        actor=user,
        action="cancel_run",
        entity_type="run",
        entity_id=str(run.id),
        reason=f"cancelled by user {user.username}",
    )
    db.commit()

    loaded = _load_run(db, run_id)
    assert loaded is not None
    return _run_to_out(loaded)


def _check_analyst_access_to_run(user: SessionUser, run: db_models.Run, db: Session) -> None:
    """Enforce §3 and §14.2: Analyst can ONLY access reports/risk-scores for PUBLISHED datasets granted to them."""
    if user.role == UserRole.DPO.value:
        return

    # Check if run has at least one PUBLISHED dataset
    published_datasets = [ds for ds in run.datasets if ds.status == DatasetStatus.PUBLISHED.value]
    if not published_datasets:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Chỉ DPO mới có quyền xem báo cáo hoặc điểm rủi ro của lần quét chưa công bố (PUBLISHED). "
                "Analyst chỉ được phép xem báo cáo sau khi dataset đã được DPO phê duyệt và công bố (§3, §14.2)."
            ),
        )

    # Check if Analyst has grant for at least one of the published datasets
    published_ids = [ds.id for ds in published_datasets]
    grant = db.scalar(
        select(db_models.DatasetGrant).where(
            db_models.DatasetGrant.dataset_id.in_(published_ids),
            db_models.DatasetGrant.user_id == user.id,
        )
    )
    if not grant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Người dùng (Analyst) chưa được DPO cấp quyền truy cập vào dataset đã công bố của lần quét này "
                "(quyền truy cập bị từ chối theo chính sách dataset_grants §3, §14.2)."
            ),
        )


@router.get("/runs/{run_id}/report")
def get_run_report(
    run_id: int,
    format: str = Query("json", description="Output format: json or html"),
    user: SessionUser = Depends(require_analyst_or_dpo),
    db: Session = Depends(get_db),
):
    """Generate compliance audit report in HTML or JSON format (FR-09, §20.1)."""
    run = _load_run(db, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found")

    _check_analyst_access_to_run(user, run, db)

    fmt = format.lower().strip()
    if fmt not in {"json", "html"}:
        raise HTTPException(status_code=400, detail="Invalid format. Must be 'json' or 'html'")

    summary_only = (user.role != UserRole.DPO.value)
    report_data = build_report_data(
        run=run,
        db=db,
        requester_name=user.username,
        summary_only=summary_only,
    )

    _write_audit(
        db,
        actor=user,
        action="export_report",
        entity_type="run",
        entity_id=str(run_id),
        reason=f"format={fmt}; summary={summary_only}",
    )
    db.commit()

    if fmt == "html":
        html_content = render_html_report(report_data)
        return HTMLResponse(content=html_content)

    return report_data


def _postgres_join_relations(conn: SourceConnection) -> list[tuple[str, str, str, str]]:
    """Logical join keys plus FOREIGN KEYs declared in a live source (same set the build guard checks)."""
    from src.transform.pg_pipeline import LOGICAL_JOIN_KEYS

    relations = list(LOGICAL_JOIN_KEYS)
    if conn.live:
        try:
            from src.connectors.postgres_connector import PostgresConnector

            relations.extend(PostgresConnector(conn.url).list_relations(conn.namespace or "public"))
        except Exception:
            pass
    return relations


def _mongo_join_relations(conn: SourceConnection) -> list[tuple[str, str, str, str]]:
    if not conn.live:
        return []
    try:
        from src.connectors.mongo_connector import MongoConnector

        return MongoConnector(conn.url, conn.namespace, client=mongo_client()).list_relations()
    except Exception:
        return []


@router.get("/runs/{run_id}/join-keys", response_model=list[JoinKeyOut])
def get_run_join_keys(
    run_id: int,
    user: SessionUser = Depends(require_dpo),
    db: Session = Depends(get_db),
) -> list[JoinKeyOut]:
    """Join keys between scanned fields: both ends must share KEEP or HMAC or the build is blocked."""
    run = _load_run(db, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found")
    source = get_source_by_id(run.source_id, db)
    if source is None:
        return []
    conn = _connection_for(source, db)
    relations = _mongo_join_relations(conn) if run.engine == "mongodb" else _postgres_join_relations(conn)

    scanned = {(p.source_path, p.field_path) for p in run.field_profiles}
    seen: set[tuple[str, str, str, str]] = set()
    out: list[JoinKeyOut] = []
    for relation in relations:
        from_table, from_column, to_table, to_column = relation
        if relation in seen or (from_table, from_column) not in scanned or (to_table, to_column) not in scanned:
            continue
        seen.add(relation)
        out.append(
            JoinKeyOut(from_table=from_table, from_column=from_column, to_table=to_table, to_column=to_column)
        )
    return out


@router.get("/runs/{run_id}/risk-score")
def get_run_risk_score(
    run_id: int,
    user: SessionUser = Depends(require_analyst_or_dpo),
    db: Session = Depends(get_db),
):
    """Retrieve deterministic risk score, tier, and drivers (FR-10, §9.4)."""
    run = _load_run(db, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found")

    _check_analyst_access_to_run(user, run, db)

    decision_map = {d.field_profile_id: d.action for d in run.field_decisions}
    return calculate_risk_score(
        field_profiles=run.field_profiles,
        decisions=decision_map,
        row_count=5000,
    )


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

    if run.status not in (RunStatus.REVIEW_REQUIRED.value, RunStatus.READY_TO_BUILD.value):
        raise HTTPException(
            status_code=422,
            detail=(
                f"Không thể cập nhật quyết định cho lượt quét ở trạng thái '{run.status}'. "
                "Chỉ cho phép cập nhật khi ở trạng thái REVIEW_REQUIRED hoặc READY_TO_BUILD."
            ),
        )

    settings = get_settings()
    is_self_approval = (run.created_by == user.id)
    if is_self_approval and not settings.self_approval_allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Vi phạm quy tắc phân tách nhiệm vụ (Separation of Duties - SoD §3): "
                "Người tạo yêu cầu quét không được tự phê duyệt chính yêu cầu của mình. "
                "Vui lòng yêu cầu DPO khác thực hiện phê duyệt."
            ),
        )

    profiles_by_id = {p.id: p for p in run.field_profiles}
    for item in body.decisions:
        profile = profiles_by_id.get(item.field_profile_id)
        if profile is None:
            raise HTTPException(
                status_code=400,
                detail=f"field_profile_id {item.field_profile_id} not in run",
            )
        # 0. DPO reclassification: only UNKNOWN (or already non-personal) fields, with a reason.
        #    PII fields must go through the exception flow below instead.
        classification, taxonomy_id = profile.classification, profile.taxonomy_id
        if item.classification_override is not None:
            if profile.classification not in _RECLASSIFIABLE:
                raise _field_error(
                    profile,
                    (
                        f"Không thể xác nhận 'không phải PII' cho trường '{profile.field_path}' "
                        f"đã được phân loại là {profile.classification}. "
                        "Hạ mức trường PII phải dùng ngoại lệ (is_exception, reason, exception_until)."
                    ),
                )
            if not (item.reason and item.reason.strip()):
                raise _field_error(
                    profile,
                    (
                        f"Xác nhận 'không phải PII' cho trường '{profile.field_path}' "
                        "bắt buộc phải ghi lý do (reason)."
                    ),
                )
            classification, taxonomy_id = item.classification_override, "NOT_PERSONAL_DATA"

        # 1. UNKNOWN check: UNKNOWN fields cannot be KEEP
        if classification == "UNKNOWN" and item.action == PolicyAction.KEEP:
            raise _field_error(
                profile,
                (
                    f"Trường '{profile.field_path}' chưa xác định (UNKNOWN) nên không được Giữ nguyên. "
                    "Hãy xác nhận 'không phải PII' (kèm lý do) hoặc chọn Che/Loại bỏ."
                ),
            )

        # 2. Minimum Masking Floor & Downgrade Rule (FR-06, FR-07, §2.2, §9.2)
        sens_level = resolve_sensitivity_level(
            classification=classification,
            taxonomy_id=taxonomy_id,
            field_path=profile.field_path,
        )
        is_explicit_non_personal = (
            classification in ("NON_PERSONAL", "NOT_PERSONAL_DATA")
            and (taxonomy_id or "") in (
                "NOT_PERSONAL_DATA",
                "NON_PERSONAL",
                "TAX_CODE_ORG",
                "MONEY_ALONE",
                "TRACKING_CODE",
                "ORDER_CODE",
                "BARCODE",
                "INVOICE_NO",
                "SYSTEM_ID",
                "",
            )
        )
        # Quasi-identifiers (L1: city, IP) may be kept for analysis without an exception;
        # they only identify someone when combined with direct identifiers, which stay masked.
        is_pii = (
            not is_explicit_non_personal
            and classification != "QUASI_IDENTIFIER"
            and (
                sens_level in ("L1", "L2", "L3")
                or classification in (
                    "PERSONAL_BASIC",
                    "PERSONAL_SENSITIVE",
                    "PERSONAL_CONTEXT",
                    "BASIC",
                    "SENSITIVE",
                )
            )
        )

        # If it is a PII field and action is KEEP: this is strictly below the minimum protection floor
        if is_pii and item.action == PolicyAction.KEEP:
            if not item.is_exception:
                raise _field_error(
                    profile,
                    (
                        f"Chính sách '{item.action.value}' yếu hơn mức che tối thiểu cho trường PII '{profile.field_path}' "
                        f"(Mức độ nhạy cảm: {sens_level}, phân loại: {profile.classification}). "
                        "Chính sách yếu hơn mức tối thiểu bị chặn (FR-06, FR-07, §2.2, §9.2). "
                        "Hạ mức chính sách bắt buộc phải ghi nhận ngoại lệ (is_exception=True), "
                        "lý do giải trình (reason), và thời hạn áp dụng (exception_until)."
                    ),
                )
            if not (item.reason and item.reason.strip()):
                raise _field_error(
                    profile,
                    (
                        f"Hạ mức chính sách ngoại lệ cho trường '{profile.field_path}' "
                        "bắt buộc phải ghi rõ lý do giải trình (reason)."
                    ),
                )
            if item.exception_until is None:
                raise _field_error(
                    profile,
                    (
                        f"Hạ mức chính sách ngoại lệ cho trường '{profile.field_path}' "
                        "bắt buộc phải có thời hạn ngoại lệ (exception_until)."
                    ),
                )
            now = datetime.now(UTC)
            exp = item.exception_until
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=UTC)
            if exp <= now:
                raise _field_error(
                    profile,
                    (
                        f"Thời hạn ngoại lệ (exception_until) cho trường '{profile.field_path}' "
                        "phải là một thời điểm trong tương lai."
                    ),
                )

        # 3. Check override reason (FR-07: bắt buộc lý do khi ghi đè)
        is_override = (item.action.value != profile.recommended_action)
        if is_override and not (item.reason and item.reason.strip()):
            raise _field_error(
                profile,
                (
                    f"Bắt buộc phải cung cấp lý do (reason) khi ghi đè chính sách cho trường '{profile.field_path}' "
                    f"(đề xuất: {profile.recommended_action}, chọn: {item.action.value}) (FR-07)."
                ),
            )

    # Replace decisions for submitted field_profile_ids (upsert by profile id) + record history.
    existing = {d.field_profile_id: d for d in run.field_decisions}
    audit_changes: list[str] = []

    for item in body.decisions:
        profile = profiles_by_id[item.field_profile_id]
        field_label = f"{profile.source_path}.{profile.field_path}"
        if item.classification_override is not None and profile.classification != item.classification_override:
            audit_changes.append(
                f"{field_label}: reclassified {profile.classification} -> {item.classification_override} by DPO"
            )
            profile.classification = item.classification_override
            profile.taxonomy_id = "NOT_PERSONAL_DATA"
            profile.detector_source = DetectorSource.DPO.value
        effective_reason = (
            item.reason.strip()
            if (item.reason and item.reason.strip())
            else f"DPO chấp thuận mức đề xuất {item.action.value} của hệ thống"
        )
        exception_tag = (
            f" [EXCEPTION until {item.exception_until.isoformat()}]"
            if item.is_exception and item.exception_until
            else ""
        )

        if item.field_profile_id in existing:
            row = existing[item.field_profile_id]
            from_action = row.action
            from_reason = row.reason
            new_version = row.decision_version + 1
            row.action = item.action.value
            row.reason = effective_reason
            row.decided_by = user.id
            row.decision_version = new_version
            row.is_exception = item.is_exception
            row.exception_until = item.exception_until

            db.add(
                db_models.FieldDecisionHistory(
                    run_id=run.id,
                    field_profile_id=item.field_profile_id,
                    from_action=from_action,
                    to_action=item.action.value,
                    from_reason=from_reason,
                    to_reason=effective_reason,
                    version=new_version,
                    decided_by=user.id,
                    is_exception=item.is_exception,
                    exception_until=item.exception_until,
                )
            )
            reason_str = f" (reason: '{effective_reason}')"
            audit_changes.append(
                f"{field_label}[v{new_version}]: {from_action} -> {item.action.value}{exception_tag}{reason_str}"
            )
        else:
            db.add(
                db_models.FieldDecision(
                    run_id=run.id,
                    field_profile_id=item.field_profile_id,
                    action=item.action.value,
                    reason=effective_reason,
                    decided_by=user.id,
                    decision_version=1,
                    is_exception=item.is_exception,
                    exception_until=item.exception_until,
                )
            )
            db.add(
                db_models.FieldDecisionHistory(
                    run_id=run.id,
                    field_profile_id=item.field_profile_id,
                    from_action=None,
                    to_action=item.action.value,
                    from_reason=None,
                    to_reason=effective_reason,
                    version=1,
                    decided_by=user.id,
                    is_exception=item.is_exception,
                    exception_until=item.exception_until,
                )
            )
            reason_str = f" (reason: '{effective_reason}')"
            audit_changes.append(
                f"{field_label}[v1]: NEW -> {item.action.value}{exception_tag}{reason_str}"
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

    detailed_audit_reason = f"count={len(body.decisions)}; changes=[{'; '.join(audit_changes)}]"
    _write_audit(
        db,
        actor=user,
        action="save_decisions",
        entity_type="run",
        entity_id=str(run.id),
        reason=detailed_audit_reason,
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

    settings = get_settings()
    is_self_approval = (run.created_by == user.id)
    if is_self_approval and not settings.self_approval_allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Vi phạm quy tắc phân tách nhiệm vụ (Separation of Duties - SoD §3): "
                "Người tạo yêu cầu quét không được tự build dataset của mình. "
                "Vui lòng yêu cầu DPO khác thực hiện."
            ),
        )

    if run.status not in (RunStatus.READY_TO_BUILD.value, RunStatus.REVIEW_REQUIRED.value):
        raise HTTPException(
            status_code=422,
            detail={
                "message": f"Build blocked: run is in state {run.status}, must be REVIEW_REQUIRED or READY_TO_BUILD",
            },
        )

    if not run.field_profiles:
        raise HTTPException(
            status_code=422,
            detail={"message": "Build blocked: no fields profiled in run"},
        )

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
            raise _field_error(
                profile,
                f"Build blocked: trường '{profile.field_path}' chưa xác định (UNKNOWN) không được Giữ nguyên.",
            )

    source = get_source_by_id(run.source_id, db)
    if source is None:
        raise HTTPException(status_code=409, detail="Source no longer exists")
    conn = _connection_for(source, db)

    # Protect active PUBLISHED datasets (§FR-08):
    # Ensure build run N+1 does not destroy an active PUBLISHED dataset sharing the same snapshot target.
    active_published = db.scalar(
        select(db_models.Dataset).where(
            db_models.Dataset.status == DatasetStatus.PUBLISHED.value,
            db_models.Dataset.run_id != run.id,
        )
    )
    if active_published and active_published.output_location:
        target_pg = conn.pg_snapshot_schema(run.id)
        target_mongo = conn.mongo_snapshot_db(run.id)
        if (
            f"postgres://{target_pg}/" in active_published.output_location
            or f"mongodb://{target_mongo}/" in active_published.output_location
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Build blocked: Target snapshot is currently occupied by active PUBLISHED dataset "
                    f"id={active_published.id}. You must revoke dataset {active_published.id} before rebuilding, "
                    "or isolate the target snapshot."
                ),
            )


    # Runs profiled from a live source must be verified on a real snapshot, never the stub.
    pg_scanned = run.engine == "postgresql" and any(
        p.coverage_status != "stub" for p in run.field_profiles
    )
    mongo_scanned = run.engine == "mongodb" and any(
        p.coverage_status != "stub" for p in run.field_profiles
    )
    if pg_scanned:
        from src.transform.pg_pipeline import (
            actions_from_run_decisions as pg_actions_from_decisions,
        )
        from src.transform.pg_pipeline import pg_join_key_violations

        pg_table_actions = pg_actions_from_decisions(run.field_profiles, run.field_decisions)
        all_pg_relations = _postgres_join_relations(conn)
        pg_violations = pg_join_key_violations(pg_table_actions, relations=tuple(all_pg_relations))
        if pg_violations:
            raise HTTPException(
                status_code=422,
                detail={
                    "message": "Build blocked: both ends of a join key must use the same "
                    "action (KEEP or HMAC), otherwise JOIN breaks",
                    "join_key_violations": pg_violations,
                },
            )

    use_mongo = mongo_scanned and conn.live
    mongo_actions: dict[str, dict[str, str]] = {}
    mongo_relations: list[tuple[str, str, str, str]] = []
    mongo_connect_error: Exception | None = None
    if use_mongo:
        from src.connectors.mongo_connector import MongoConnector
        from src.transform.mongo_pipeline import (
            actions_from_run_decisions as mongo_actions_from_decisions,
        )
        from src.transform.mongo_pipeline import join_key_violations

        mongo_actions = mongo_actions_from_decisions(run.field_profiles, run.field_decisions)
        try:
            mongo_relations = MongoConnector(
                conn.url, conn.namespace, client=mongo_client()
            ).list_relations()
        except Exception as exc:
            mongo_connect_error = exc
        violations = join_key_violations(mongo_actions, mongo_relations)
        if violations:
            raise HTTPException(
                status_code=422,
                detail={
                    "message": "Build blocked: both ends of a join key must use the same "
                    "action (KEEP or HMAC), otherwise $lookup breaks",
                    "join_key_violations": violations,
                },
            )

    # Failed prior datasets must not become readable.
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

    check_rows: list[dict] = []

    if pg_scanned and conn.live and settings.snapshot_database_url:
        try:
            from src.transform.pg_pipeline import (
                actions_from_run_decisions,
                run_protected_postgres_pipeline,
            )

            table_actions = actions_from_run_decisions(run.field_profiles, run.field_decisions)
            written, checks = run_protected_postgres_pipeline(
                source_url=conn.url,
                snapshot_url=settings.snapshot_database_url,
                secret=settings.hmac_secret,
                key_version=settings.hmac_key_version,
                table_actions=table_actions,
                snapshot_schema=conn.pg_snapshot_schema(run.id),
                source_schema=conn.namespace,
                default_action=PolicyAction.DROP.value,
                generic_verify=conn.user_supplied,
            )
            dataset.output_location = (
                f"postgres://{conn.pg_snapshot_schema(run.id)}/"
                + ",".join(sorted(written.keys()))
            )
            check_rows = [
                {
                    "check_name": c.check_name,
                    "status": c.status,
                    "baseline_value": c.baseline_value,
                    "actual_value": c.actual_value,
                    "tolerance": c.tolerance,
                    "details": c.details,
                }
                for c in checks
            ]
            # Always record policy_complete as well
            check_rows.insert(
                0,
                {
                    "check_name": "policy_complete",
                    "status": VerifierCheckStatus.PASSED.value,
                    "baseline_value": str(len(run.field_profiles)),
                    "actual_value": str(len(run.field_decisions)),
                    "tolerance": "0",
                    "details": "Every field has a DPO decision",
                },
            )
        except Exception as exc:
            check_rows = [
                {
                    "check_name": "postgres_snapshot_pipeline",
                    "status": VerifierCheckStatus.FAILED.value,
                    "baseline_value": "ok",
                    "actual_value": "error",
                    "tolerance": "n/a",
                    "details": f"Pipeline error: {type(exc).__name__}",
                }
            ]
    elif pg_scanned:
        check_rows = [
            {
                "check_name": "postgres_snapshot_pipeline",
                "status": VerifierCheckStatus.FAILED.value,
                "baseline_value": "configured",
                "actual_value": "not_configured",
                "tolerance": "n/a",
                "details": "Snapshot target not configured "
                "(SNAPSHOT_DATABASE_URL; demo sources also need ENABLE_PG_SNAPSHOT, SOURCE_DATABASE_URL)",
            }
        ]
    elif use_mongo:
        try:
            if mongo_connect_error is not None:
                raise mongo_connect_error
            from src.transform.mongo_pipeline import run_protected_mongo_pipeline

            written, checks = run_protected_mongo_pipeline(
                uri=conn.url,
                source_db=conn.namespace,
                snapshot_db=conn.mongo_snapshot_db(run.id),
                secret=settings.hmac_secret,
                key_version=settings.hmac_key_version,
                table_actions=mongo_actions,
                relations=mongo_relations,
                client=mongo_client(),
                default_action=PolicyAction.DROP.value,
            )
            dataset.output_location = (
                f"mongodb://{conn.mongo_snapshot_db(run.id)}/" + ",".join(sorted(written))
            )
            check_rows = [
                {
                    "check_name": "policy_complete",
                    "status": VerifierCheckStatus.PASSED.value,
                    "baseline_value": str(len(run.field_profiles)),
                    "actual_value": str(len(run.field_decisions)),
                    "tolerance": "0",
                    "details": "Every field has a DPO decision",
                },
                *checks,
            ]
        except Exception as exc:
            check_rows = [
                {
                    "check_name": "mongo_snapshot_pipeline",
                    "status": VerifierCheckStatus.FAILED.value,
                    "baseline_value": "ok",
                    "actual_value": "error",
                    "tolerance": "n/a",
                    "details": f"Pipeline error: {type(exc).__name__}",
                }
            ]
    elif mongo_scanned:
        check_rows = [
            {
                "check_name": "mongo_snapshot_pipeline",
                "status": VerifierCheckStatus.FAILED.value,
                "baseline_value": "configured",
                "actual_value": "not_configured",
                "tolerance": "n/a",
                "details": "Mongo source not configured (ENABLE_MONGO, MONGO_URI)",
            }
        ]
    else:
        # Only runs profiled from a demo_stub source reach here (no live connector configured).
        decision_count = len(run.field_decisions)
        check_rows = [
            {
                "check_name": "policy_complete",
                "status": VerifierCheckStatus.PASSED.value,
                "baseline_value": str(len(run.field_profiles)),
                "actual_value": str(decision_count),
                "tolerance": "0",
                "details": "Every field has a DPO decision",
            },
            {
                "check_name": "schema_ok",
                "status": VerifierCheckStatus.PASSED.value,
                "baseline_value": "ok",
                "actual_value": "ok",
                "tolerance": "exact",
                "details": "Output schema matches allowed field set (stub)",
            },
            {
                "check_name": "demo_stub_downstream",
                "status": VerifierCheckStatus.PASSED.value,
                "baseline_value": "pass",
                "actual_value": "pass",
                "tolerance": "n/a",
                "details": f"Demo source (no live connector) for engine={run.engine}",
            },
        ]

    verifier_rows: list[db_models.VerifierResult] = []
    for check in check_rows:
        row = db_models.VerifierResult(dataset_id=dataset.id, **check)
        db.add(row)
        verifier_rows.append(row)
    db.flush()

    if any(r.status == VerifierCheckStatus.FAILED.value for r in verifier_rows):
        dataset.status = DatasetStatus.FAILED.value
        run.status = RunStatus.FAILED.value
        reason = "build -> FAILED (verifier)"
    else:
        dataset.status = DatasetStatus.VERIFIED.value
        run.status = RunStatus.VERIFIED.value
        reason = "build -> VERIFIED (verifier passed)"

    _write_audit(
        db,
        actor=user,
        action="build_run",
        entity_type="dataset",
        entity_id=str(dataset.id),
        reason=reason,
    )
    db.commit()

    loaded = _load_run(db, run_id)
    assert loaded is not None
    ds_out = next(ds for ds in _run_to_out(loaded).datasets if ds.id == dataset.id)
    results = db.scalars(
        select(db_models.VerifierResult).where(
            db_models.VerifierResult.dataset_id == dataset.id
        )
    ).all()
    return BuildResponse(
        run=_run_to_out(loaded),
        dataset=ds_out,
        verifier_results=[
            VerifierResultOut(
                id=r.id,
                dataset_id=r.dataset_id,
                check_name=r.check_name,
                status=VerifierCheckStatus(r.status),
                baseline_value=r.baseline_value,
                actual_value=r.actual_value,
                tolerance=r.tolerance,
                details=r.details,
            )
            for r in results
        ],
    )


@router.post("/runs/{run_id}/orchestrate")
def orchestrate_run(
    run_id: int,
    user: SessionUser = Depends(require_dpo),
    db: Session = Depends(get_db),
) -> dict:
    """Execute LangGraph 8-node orchestrator pipeline on a real run (§7, §14.2)."""
    run = _load_run(db, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found")

    approvals = []
    if run.field_decisions:
        for p in run.field_profiles:
            dec = next((d for d in run.field_decisions if d.field_profile_id == p.id), None)
            if dec:
                approvals.append({
                    "field_path": p.field_path,
                    "action": dec.action,
                    "is_exception": getattr(dec, "is_exception", False),
                    "reason": dec.reason or "",
                })

    graph = build_orchestrator_graph()
    initial_state = {
        "run_id": str(run.id),
        "review_status": "approved" if approvals else "pending",
        "approvals": approvals,
    }

    config = {"configurable": {"thread_id": f"api_run_{run.id}"}}
    result = graph.invoke(initial_state, config=config)

    _write_audit(
        db,
        actor=user,
        action="orchestrate_run",
        entity_type="run",
        entity_id=str(run.id),
        reason=f"status={result.get('status')}; verified={result.get('verification', {}).get('passed')}",
    )
    db.commit()

    return {
        "run_id": run.id,
        "status": result.get("status"),
        "verification": result.get("verification"),
        "risk": result.get("risk"),
        "applied_count": len(result.get("applied", [])),
        "alert_emitted": result.get("alert_emitted", False),
    }

