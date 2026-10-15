"""Compliance Report Generator for PII Guardian Agent (FR-09, §20.1, Appendix F).

Generates deterministic compliance audit reports in HTML and JSON formats.
Enforces Zero Raw-PII Egress (§6.3) — reports only contain masked representations
and aggregated metrics.
"""

from __future__ import annotations

import hashlib
import html
import json
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.config import get_settings
from src.db import models as db_models
from src.services.risk_scorer import calculate_risk_score, resolve_sensitivity_level

TAXONOMY_VERSION = "v1.3-vn-luat91"
RECOGNIZER_VERSION = "v1.0-regex+bm25+llm"
REPORT_SPEC_VERSION = "1.1.0"
LEGAL_BASIS = "Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15 & Nghị định 356/2025/NĐ-CP"

# Runs whose decisions are not yet approved: the report then shows system recommendations only.
_DRAFT_RUN_STATUSES = frozenset({"NEW", "SCANNING", "REVIEW_REQUIRED"})

def _snapshot_output_for(action: str, key_version: str, exception_until: Any = None) -> str:
    """What the protected snapshot holds for this column (mask_engine.apply_action) — never a value."""
    act = (action or "KEEP").upper()
    if act == "DROP":
        return "Không có trong snapshot (cột bị loại bỏ)"
    if act == "MASK":
        return "Toàn bộ giá trị thay bằng ***"
    if act == "HMAC":
        return f"HMAC-SHA256 (khoá {key_version}): không đảo ngược, vẫn JOIN được"
    if act == "REDACT":
        return "Văn bản giữ lại, từng thực thể PII thay bằng nhãn (vd. [PHONE], [PERSON_NAME])"
    if exception_until:
        return f"Giữ nguyên giá trị (ngoại lệ đến {str(exception_until)[:10]})"
    return "Giữ nguyên giá trị"


def build_report_data(
    run: db_models.Run,
    db: Session,
    requester_name: str | None = None,
    summary_only: bool = False,
    row_count: int | None = None,
) -> dict[str, Any]:
    """Compile comprehensive, deterministic audit metrics into a JSON-serializable dictionary.

    If summary_only=True (Analyst role §3), granular inventory schema columns and masked samples
    are excluded to protect internal schema and prevent inference attacks.
    """
    # 1. Resolve actors
    requester = requester_name
    if not requester:
        creator = db.scalar(select(db_models.DemoUser).where(db_models.DemoUser.id == run.created_by))
        requester = creator.username if creator else f"User #{run.created_by}"

    # Unique approvers from decisions
    approver_ids = {d.decided_by for d in run.field_decisions}
    approvers: list[str] = []
    if approver_ids:
        users = db.scalars(select(db_models.DemoUser).where(db_models.DemoUser.id.in_(approver_ids))).all()
        approvers = [u.username for u in users]
    if not approvers:
        approvers = ["Chưa phê duyệt (Pending DPO Review)"]

    is_self_approved = bool(run.created_by in approver_ids)
    is_draft = run.status in _DRAFT_RUN_STATUSES or not run.field_decisions
    key_version = get_settings().hmac_key_version

    # 2. Decisions map & Risk score
    decision_map = {d.field_profile_id: d.action for d in run.field_decisions}
    decisions_by_profile_id = {d.field_profile_id: d for d in run.field_decisions}

    vol_rows = row_count if row_count is not None else 5000
    risk_result = calculate_risk_score(
        field_profiles=run.field_profiles,
        decisions=decision_map,
        row_count=vol_rows,
    )

    # 3. Source paths & inventory
    source_paths = {p.source_path for p in run.field_profiles}
    inventory: list[dict[str, Any]] = []
    dpo_overrides = 0

    for p in run.field_profiles:
        lvl = resolve_sensitivity_level(
            classification=p.classification,
            taxonomy_id=p.taxonomy_id,
            field_path=p.field_path,
        )
        dec = decisions_by_profile_id.get(p.id)
        effective_action = dec.action if dec else p.recommended_action

        if dec and dec.action != p.recommended_action:
            dpo_overrides += 1

        exception_until = getattr(dec, "exception_until", None)
        snapshot_output = _snapshot_output_for(effective_action, key_version, exception_until)

        inventory.append(
            {
                "id": p.id,
                "table": p.source_path,
                "column": p.field_path,
                "data_type": p.data_type,
                "classification": p.classification,
                "taxonomy_id": p.taxonomy_id or "N/A",
                "sensitivity_level": lvl,
                "detector_source": p.detector_source,
                "recommended_action": p.recommended_action,
                "effective_action": effective_action,
                "is_dpo_override": bool(dec and dec.action != p.recommended_action),
                "is_exception": getattr(dec, "is_exception", False),
                "exception_until": exception_until,
                "decision_reason": dec.reason if dec else "Đề xuất tự động, DPO chưa duyệt",
                "snapshot_output": snapshot_output,
                "coverage_status": p.coverage_status,
                "summary": p.profile_summary,
            }
        )

    # Sort inventory by sensitivity descending (L3 -> L2 -> L1 -> L0), then table, column
    level_sort_order = {"L3": 0, "L2": 1, "L1": 2, "L0": 3}
    inventory.sort(key=lambda x: (level_sort_order.get(x["sensitivity_level"], 4), x["table"], x["column"]))

    # 4. Verifier results
    verifier_items: list[dict[str, Any]] = []
    dataset_status = None
    dataset_name = None
    # Only the latest build counts: earlier snapshots of the same run were replaced.
    latest = max(run.datasets, key=lambda d: d.id, default=None)
    for ds in [latest] if latest is not None else []:
        dataset_status = ds.status
        dataset_name = ds.dataset_name
        v_results = db.scalars(
            select(db_models.VerifierResult).where(db_models.VerifierResult.dataset_id == ds.id)
        ).all()
        for v in v_results:
            verifier_items.append(
                {
                    "check_name": v.check_name,
                    "status": v.status,
                    "baseline_value": v.baseline_value,
                    "actual_value": v.actual_value,
                    "tolerance": v.tolerance,
                    "details": v.details,
                }
            )

    now_iso = datetime.now(UTC).isoformat()
    total_fields = len(run.field_profiles)
    egress_checks = [v for v in verifier_items if v["check_name"] == "zero_raw_pii_egress"]
    if latest is None:
        egress_statement = "Chưa kiểm chứng: run chưa tạo snapshot"
    elif not egress_checks:
        egress_statement = "Verifier của nguồn này không có bước kiểm tra rò rỉ giá trị gốc"
    elif all(v["status"] == "PASSED" for v in egress_checks):
        egress_statement = "Đạt: verifier không tìm thấy giá trị gốc trong snapshot"
    else:
        egress_statement = "KHÔNG ĐẠT: verifier phát hiện giá trị gốc trong snapshot"
    pii_count = risk_result["drivers"]["total_pii_fields"]
    protected_count = risk_result["drivers"]["protected_pii_fields"]

    raw_canonical = json.dumps(
        {
            "run_id": run.id,
            "source_id": run.source_id,
            "created_at": run.created_at.isoformat() if run.created_at else now_iso,
            "risk_score": risk_result["score"],
            "total_fields": total_fields,
            "pii_fields": pii_count,
            "inventory_summary": [(i["table"], i["column"], i["effective_action"]) for i in inventory],
        },
        sort_keys=True,
    )
    content_hash = hashlib.sha256(raw_canonical.encode("utf-8")).hexdigest()

    return {
        "report_id": f"REP-RUN-{run.id:04d}-{content_hash[:8].upper()}",
        "report_type": "SUMMARY" if summary_only else "FULL",
        "is_draft": is_draft,
        "legal_basis": LEGAL_BASIS,
        "summary_view": summary_only,
        "is_self_approved": is_self_approved,
        "run_id": run.id,
        "source_id": run.source_id,
        "source_name": run.source_name,
        "engine": run.engine,
        "run_status": run.status,
        "dataset_name": dataset_name or f"ds_run_{run.id}",
        "dataset_status": dataset_status or "STAGING",
        "created_at": run.created_at.isoformat() if run.created_at else now_iso,
        "generated_at": now_iso,
        "requester": requester,
        "approvers": approvers,
        "versions": {
            "taxonomy_version": TAXONOMY_VERSION,
            "recognizer_version": RECOGNIZER_VERSION,
            "policy_version": run.policy_version or "v1",
            "source_manifest_version": run.source_manifest_version or "v1",
            "report_spec_version": REPORT_SPEC_VERSION,
        },
        "risk_assessment": {
            "score": risk_result["score"],
            "tier": risk_result["tier"],
            "action_required": risk_result["action_required"],
            "max_sensitivity_level": risk_result["max_sensitivity_level"],
            "drivers": risk_result["drivers"],
        },
        "metrics": {
            "total_tables_scanned": len(source_paths),
            "total_fields_scanned": total_fields,
            "pii_fields_detected": pii_count,
            "protected_fields_count": protected_count,
            "unmasked_pii_count": risk_result["drivers"]["unmasked_pii_fields"],
            "protection_pct": risk_result["drivers"]["protection_pct"],
            "dpo_decisions_count": len(run.field_decisions),
            "dpo_overrides_count": dpo_overrides,
            "sensitivity_breakdown": risk_result["level_counts"],
            "actions_breakdown": risk_result["action_counts"],
            "coverage_statement": (
                f"{total_fields} trường trên {len(source_paths)} bảng/collection trong phạm vi DPO đã chọn"
            ),
            "raw_pii_egress": egress_statement,
            "row_count": risk_result["drivers"]["row_count"],
            "row_count_estimated": row_count is None,
        },
        "inventory": [] if summary_only else inventory,
        "verification_checks": verifier_items,
        "residual_risks": _residual_risks(inventory),
        "limitations": (
            "Báo cáo được lập tự động từ siêu dữ liệu (metadata) của lượt quét, đối chiếu "
            f"{LEGAL_BASIS}. Phân loại dựa trên mẫu dữ liệu đọc trong bộ nhớ lúc quét, nên có thể bỏ sót "
            "PII xuất hiện thưa trong các bản ghi không được lấy mẫu. Báo cáo không chứa giá trị dữ liệu gốc. "
            "Mọi thay đổi chính sách cần Cán bộ Bảo vệ Dữ liệu (DPO) phê duyệt."
        ),
        "audit_proof": {
            "content_hash": content_hash,
            "algorithm": "SHA-256",
            "tamper_evident": True,
        },
    }


def _residual_risks(inventory: list[dict[str, Any]]) -> list[dict[str, str]]:
    """Residual risks that actually apply to this run's protected output."""
    risks: list[dict[str, str]] = []
    hmac_cols = [f"{i['table']}.{i['column']}" for i in inventory if i["effective_action"] == "HMAC"]
    if hmac_cols:
        risks.append(
            {
                "risk_title": "Dò từ điển trên giá trị HMAC",
                "level": "Trung bình",
                "description": (
                    f"{len(hmac_cols)} cột dùng HMAC-SHA256 để giữ khả năng JOIN. Nếu tập giá trị nhỏ "
                    "(ví dụ số điện thoại, CCCD) và khoá bị lộ, có thể dò ngược. Giữ khoá trong Secret Manager "
                    "và xoay khoá định kỳ."
                ),
            }
        )
    def _names(items: list[dict[str, Any]]) -> str:
        more = "…" if len(items) > 5 else ""
        return ", ".join(f"{i['table']}.{i['column']}" for i in items[:5]) + more

    kept = [i for i in inventory if i["effective_action"] == "KEEP"]
    kept_pii = [i for i in kept if i["sensitivity_level"] in ("L2", "L3")]
    if kept_pii:
        risks.append(
            {
                "risk_title": "Cột PII được giữ nguyên theo ngoại lệ",
                "level": "Cao" if any(i["sensitivity_level"] == "L3" for i in kept_pii) else "Trung bình",
                "description": (
                    f"{len(kept_pii)} cột PII không được che ({_names(kept_pii)}). "
                    "Analyst sẽ thấy giá trị thật cho tới khi ngoại lệ hết hạn."
                ),
            }
        )
    kept_quasi = [i for i in kept if i["sensitivity_level"] == "L1"]
    if kept_quasi:
        risks.append(
            {
                "risk_title": "Định danh gián tiếp (L1) được giữ nguyên",
                "level": "Thấp",
                "description": (
                    f"{len(kept_quasi)} cột ({_names(kept_quasi)}) được giữ để phân tích. Riêng lẻ chúng không "
                    "định danh được ai, nhưng kết hợp nhiều cột có thể tái định danh."
                ),
            }
        )
    free_text = [i for i in inventory if (i["taxonomy_id"] or "").upper() == "FREE_TEXT_PII"]
    if free_text:
        risks.append(
            {
                "risk_title": "PII ẩn trong văn bản tự do",
                "level": "Thấp đến trung bình",
                "description": (
                    f"{len(free_text)} cột văn bản tự do (ghi chú, nội dung trao đổi) có thể chứa PII rải rác "
                    "mà việc lấy mẫu không bắt được. Nên DROP hoặc MASK thay vì giữ nguyên."
                ),
            }
        )
    return risks


_TIER_LABELS = {"Critical": "Nghiêm trọng", "High": "Cao", "Medium": "Trung bình", "Low": "Thấp"}


def render_html_report(data: dict[str, Any]) -> str:
    """Render a polished, executive HTML report suitable for browser viewing and PDF printing.

    All dynamic strings are escaped via html.escape to eliminate Stored XSS vulnerabilities.
    """
    def _esc(val: Any) -> str:
        return html.escape(str(val)) if val is not None else ""

    score = data["risk_assessment"]["score"]
    tier = data["risk_assessment"]["tier"]

    # Tier color styling
    tier_colors = {
        "Critical": ("#dc2626", "#fee2e2", "#991b1b"),
        "High": ("#ea580c", "#ffedd5", "#9a3412"),
        "Medium": ("#d97706", "#fef3c7", "#92400e"),
        "Low": ("#16a34a", "#dcfce7", "#166534"),
    }
    t_fg, t_bg, t_border = tier_colors.get(tier, ("#4b5563", "#f3f4f6", "#374151"))

    # Inventory rows HTML
    rows_html = []
    if data.get("summary_view"):
        rows_html.append(
            '<tr><td colspan="7" style="text-align:center; color:#64748b; padding:24px; font-style:italic;">'
            '🔒 Danh mục chi tiết từng trường dữ liệu (Inventory & Masked Samples) được bảo mật '
            'và chỉ cung cấp cho vai trò DPO theo chính sách phân tách nhiệm vụ (§3, §14.2).'
            '</td></tr>'
        )
    else:
        for item in data.get("inventory", []):
            lvl = item["sensitivity_level"]
            lvl_badge_color = {
                "L3": "background-color: #fee2e2; color: #991b1b; border: 1px solid #f87171;",
                "L2": "background-color: #ffedd5; color: #9a3412; border: 1px solid #fb923c;",
                "L1": "background-color: #fef3c7; color: #92400e; border: 1px solid #fde68a;",
                "L0": "background-color: #f1f5f9; color: #475569; border: 1px solid #cbd5e1;",
            }.get(lvl, "background-color: #f1f5f9; color: #475569;")

            act = item["effective_action"]
            act_badge_color = {
                "HMAC": "background-color: #e0e7ff; color: #3730a3; border: 1px solid #c7d2fe;",
                "MASK": "background-color: #fef08a; color: #854d0e; border: 1px solid #fde047;",
                "DROP": "background-color: #fee2e2; color: #991b1b; border: 1px solid #fca5a5;",
                "KEEP": "background-color: #dcfce7; color: #166534; border: 1px solid #86efac;",
                "PARTIAL": "background-color: #fef3c7; color: #92400e; border: 1px solid #fcd34d;",
                "GENERALIZE": "background-color: #e0f2fe; color: #075985; border: 1px solid #bae6fd;",
                "TOKENIZE": "background-color: #ede9fe; color: #5b21b6; border: 1px solid #ddd6fe;",
                "REDACT": "background-color: #ffe4e6; color: #9f1239; border: 1px solid #fecdd3;",
                "NULLIFY": "background-color: #f1f5f9; color: #475569; border: 1px solid #cbd5e1;",
            }.get(act, "background-color: #f3f4f6; color: #374151;")

            override_marker = (
                '<span style="color:#d97706; font-size:11px; font-weight:600;">[DPO Sửa]</span>'
                if item["is_dpo_override"]
                else ""
            )

            rows_html.append(
                f"""<tr>
                    <td style="font-family:monospace; font-weight:600;">{_esc(item['table'])}</td>
                    <td style="font-family:monospace; color:#1e293b;">{_esc(item['column'])}</td>
                    <td><span style="font-size:11px; padding:2px 8px; border-radius:12px; font-weight:700; {lvl_badge_color}">{_esc(lvl)}</span></td>
                    <td><span style="font-size:12px; font-weight:600; color:#334155;">{_esc(item['taxonomy_id'])}</span></td>
                    <td><span style="font-size:11px; padding:2px 8px; border-radius:12px; font-weight:700; {act_badge_color}">{_esc(act)}</span> {override_marker}</td>
                    <td style="font-size:12px; color:#475569; background:#f8fafc;">{_esc(item.get('snapshot_output', ''))}</td>
                    <td style="font-size:12px; color:#64748b;">{_esc(item['decision_reason'])}</td>
                </tr>"""
            )

    inventory_table_body = "\n".join(rows_html)

    # Verification checks HTML
    checks_html = []
    if data["verification_checks"]:
        for chk in data["verification_checks"]:
            is_pass = chk["status"] == "PASSED"
            badge = (
                '<span style="background:#dcfce7; color:#166534; font-weight:700; padding:2px 8px; border-radius:12px; font-size:11px;">Đạt</span>'
                if is_pass
                else '<span style="background:#fee2e2; color:#991b1b; font-weight:700; padding:2px 8px; border-radius:12px; font-size:11px;">Không đạt</span>'
            )
            checks_html.append(
                f"""<tr>
                    <td style="font-family:monospace; font-weight:600;">{_esc(chk['check_name'])}</td>
                    <td>{badge}</td>
                    <td style="font-size:12px; color:#475569;">{_esc(chk['baseline_value'])}</td>
                    <td style="font-size:12px; color:#475569;">{_esc(chk['actual_value'])}</td>
                    <td style="font-size:12px; color:#64748b;">{_esc(chk['details'])}</td>
                </tr>"""
            )
    else:
        checks_html.append(
            '<tr><td colspan="5" style="text-align:center; color:#94a3b8; padding:16px;">Chưa chạy verifier hậu kiểm sau masking</td></tr>'
        )
    checks_table_body = "\n".join(checks_html)

    # Approvers text
    approvers_str = ", ".join(_esc(a) for a in data.get("approvers", []))

    sod_warning_html = ""
    if data.get("is_self_approved"):
        sod_warning_html = """
        <div style="background: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #f59e0b; padding: 14px 16px; border-radius: 6px; margin-bottom: 24px; font-size: 13px; color: #92400e;">
            <strong style="color: #b45309; display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                ⚠️ Cảnh báo phân tách nhiệm vụ — cùng một người yêu cầu và phê duyệt
            </strong>
            Quá trình yêu cầu quét và phê duyệt quyết định được thực hiện bởi cùng một người dùng. Hệ thống ghi nhận cảnh báo kiểm toán và yêu cầu rà soát độc lập (§3).
        </div>
        """

    draft_banner_html = ""
    if data.get("is_draft"):
        draft_banner_html = """
        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-left: 4px solid #2563eb; padding: 14px 16px; border-radius: 6px; margin-bottom: 24px; font-size: 13px; color: #1e3a8a;">
            <strong style="display: block; margin-bottom: 4px;">BẢN NHÁP — DPO chưa phê duyệt</strong>
            Chính sách và tỷ lệ bảo vệ bên dưới là đề xuất tự động của hệ thống. Báo cáo chỉ có giá trị làm
            bằng chứng sau khi DPO lưu quyết định và tạo snapshot.
        </div>
        """

    residual_items = "".join(
        f"<li style='margin-bottom:8px;'><strong>{_esc(r['risk_title'])} ({_esc(r['level'])}):</strong> {_esc(r['description'])}</li>"
        for r in data.get("residual_risks", [])
    ) or "<li>Không ghi nhận rủi ro tồn dư đặc thù cho lượt quét này.</li>"

    return f"""<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Báo Cáo Tuân Thủ Bảo Vệ Dữ Liệu PII - {_esc(data['report_id'])}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        * {{
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }}
        body {{
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #f8fafc;
            color: #0f172a;
            line-height: 1.5;
            padding: 32px 16px;
        }}
        .report-container {{
            max-width: 1040px;
            margin: 0 auto;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
            padding: 40px;
        }}
        .header {{
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #f1f5f9;
            padding-bottom: 24px;
            margin-bottom: 32px;
        }}
        .brand {{
            display: flex;
            align-items: center;
            gap: 12px;
        }}
        .brand-icon {{
            width: 44px;
            height: 44px;
            background: linear-gradient(135deg, #2563eb, #1d4ed8);
            color: white;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            font-size: 20px;
        }}
        .brand h1 {{
            font-size: 20px;
            font-weight: 700;
            color: #0f172a;
            letter-spacing: -0.02em;
        }}
        .brand p {{
            font-size: 13px;
            color: #64748b;
        }}
        .badge-versions {{
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            justify-content: flex-end;
        }}
        .version-tag {{
            font-size: 11px;
            font-family: monospace;
            background: #f1f5f9;
            color: #475569;
            padding: 3px 8px;
            border-radius: 6px;
            border: 1px solid #e2e8f0;
        }}
        .executive-summary {{
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 24px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 24px;
            margin-bottom: 32px;
        }}
        .meta-grid {{
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
            font-size: 13px;
        }}
        .meta-item strong {{
            color: #475569;
            display: block;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 2px;
        }}
        .risk-card {{
            background: #ffffff;
            border: 1px solid {t_border};
            border-radius: 8px;
            padding: 16px;
            text-align: center;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
        }}
        .risk-score {{
            font-size: 38px;
            font-weight: 800;
            color: {t_fg};
            line-height: 1;
            margin-bottom: 4px;
        }}
        .risk-tier {{
            font-size: 13px;
            font-weight: 700;
            color: {t_fg};
            background: {t_bg};
            padding: 4px 12px;
            border-radius: 12px;
            display: inline-block;
            margin-bottom: 6px;
        }}
        .risk-action {{
            font-size: 11px;
            color: #64748b;
        }}
        .section-title {{
            font-size: 16px;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 8px;
        }}
        .stats-grid {{
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
            margin-bottom: 32px;
        }}
        .stat-card {{
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 16px;
            text-align: center;
        }}
        .stat-value {{
            font-size: 24px;
            font-weight: 700;
            color: #1e293b;
        }}
        .stat-label {{
            font-size: 12px;
            color: #64748b;
            margin-top: 4px;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
            margin-bottom: 32px;
        }}
        th {{
            background: #f1f5f9;
            color: #334155;
            font-weight: 600;
            text-align: left;
            padding: 10px 12px;
            border: 1px solid #e2e8f0;
            font-size: 12px;
        }}
        td {{
            padding: 10px 12px;
            border: 1px solid #e2e8f0;
        }}
        tr:hover {{
            background-color: #f8fafc;
        }}
        .alert-box {{
            background: #eff6ff;
            border-left: 4px solid #3b82f6;
            padding: 16px;
            border-radius: 0 8px 8px 0;
            margin-bottom: 32px;
            font-size: 13px;
            color: #1e40af;
        }}
        .alert-box strong {{
            display: block;
            margin-bottom: 4px;
            color: #1e3a8a;
        }}
        .footer {{
            border-top: 2px solid #f1f5f9;
            padding-top: 20px;
            font-size: 12px;
            color: #64748b;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }}
        .hash-proof {{
            font-family: monospace;
            font-size: 11px;
            background: #f1f5f9;
            padding: 4px 8px;
            border-radius: 4px;
        }}
        @media print {{
            body {{
                background: white;
                padding: 0;
            }}
            .report-container {{
                border: none;
                box-shadow: none;
                padding: 0;
            }}
            button {{
                display: none !important;
            }}
        }}
    </style>
</head>
<body>
    <div class="report-container">
        <!-- Header -->
        <div class="header">
            <div class="brand">
                <div class="brand-icon">🛡️</div>
                <div>
                    <h1>BÁO CÁO TUÂN THỦ BẢO VỆ DỮ LIỆU CÁ NHÂN (PII)</h1>
                    <p>PIIGuard Shield • Đối chiếu {_esc(data.get('legal_basis', LEGAL_BASIS))}</p>
                </div>
            </div>
            <div class="badge-versions">
                <span class="version-tag">Phân loại: {_esc(data['versions']['taxonomy_version'])}</span>
                <span class="version-tag">Bộ nhận diện: {_esc(data['versions']['recognizer_version'])}</span>
                <span class="version-tag">Chính sách: {_esc(data['versions']['policy_version'])}</span>
            </div>
        </div>

        {draft_banner_html}
        {sod_warning_html}

        <!-- Executive Summary -->
        <div class="executive-summary">
            <div class="meta-grid">
                <div class="meta-item">
                    <strong>Mã Báo Cáo</strong>
                    <span style="font-family:monospace; font-weight:700;">{_esc(data['report_id'])}</span>
                </div>
                <div class="meta-item">
                    <strong>Nguồn Dữ Liệu</strong>
                    <span>{_esc(data['source_name'])} ({_esc(data['engine']).upper()})</span>
                </div>
                <div class="meta-item">
                    <strong>Thời Điểm Quét</strong>
                    <span>{_esc(data['created_at'][:19].replace('T', ' '))} UTC</span>
                </div>
                <div class="meta-item">
                    <strong>Trạng Thái Run</strong>
                    <span style="font-weight:700; color:#2563eb;">{_esc(data['run_status'])}</span>
                </div>
                <div class="meta-item">
                    <strong>Người Yêu Cầu</strong>
                    <span>{_esc(data['requester'])}</span>
                </div>
                <div class="meta-item">
                    <strong>Người Phê Duyệt (DPO)</strong>
                    <span>{approvers_str}</span>
                </div>
            </div>
            <div class="risk-card">
                <span class="risk-tier">Rủi ro {_esc(_TIER_LABELS.get(tier, tier)).lower()}</span>
                <div class="risk-score">{score}</div>
                <span class="risk-action">{_esc(data['risk_assessment']['action_required'])}</span>
            </div>
        </div>

        <!-- KPI Cards -->
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">{data['metrics']['total_fields_scanned']}</div>
                <div class="stat-label">Tổng Trường Quét ({data['metrics']['total_tables_scanned']} bảng)</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" style="color:#d97706;">{data['metrics']['pii_fields_detected']}</div>
                <div class="stat-label">Trường PII Phát Hiện</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" style="color:#16a34a;">{data['metrics']['protection_pct']}%</div>
                <div class="stat-label">Tỷ Lệ Cột PII Được Bảo Vệ{' (theo đề xuất)' if data.get('is_draft') else ''}</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" style="color:#dc2626;">{data['metrics']['sensitivity_breakdown'].get('L3', 0)}</div>
                <div class="stat-label">Cột Nhạy Cảm Cao (L3)</div>
            </div>
        </div>

        <!-- PII Inventory Section -->
        <div class="section-title">📋 Bảng Kiểm Kê & Biện Pháp Xử Lý PII</div>
        <table>
            <thead>
                <tr>
                    <th>Bảng / Collection</th>
                    <th>Cột / Trường</th>
                    <th>Mức Nhạy Cảm</th>
                    <th>Thực Thể PII</th>
                    <th>{'Chính Sách Đề Xuất' if data.get('is_draft') else 'Chính Sách Áp Dụng'}</th>
                    <th>Dữ Liệu Trong Snapshot</th>
                    <th>Lý Do / Căn Cứ</th>
                </tr>
            </thead>
            <tbody>
                {inventory_table_body}
            </tbody>
        </table>

        <!-- Verification Results -->
        <div class="section-title">✅ Kết Quả Kiểm Chứng Tự Động</div>
        <table>
            <thead>
                <tr>
                    <th>Tên Bài Kiểm Thử</th>
                    <th>Trạng Thái</th>
                    <th>Giá Trị Tiêu Chuẩn</th>
                    <th>Giá Trị Thực Tế</th>
                    <th>Ghi Chú</th>
                </tr>
            </thead>
            <tbody>
                {checks_table_body}
            </tbody>
        </table>

        <!-- Limitations & Disclaimers -->
        <div class="alert-box">
            <strong>⚠️ Hạn Chế Kỹ Thuật & Khuyến Nghị Vận Hành</strong>
            {_esc(data['limitations'])}
        </div>

        <!-- Residual Risks -->
        <div class="section-title">🛡️ Đánh Giá Rủi Ro Tồn Dư</div>
        <ul style="font-size:13px; color:#475569; margin-left:20px; margin-bottom:32px;">
            {residual_items}
        </ul>

        <!-- Footer / Hash Proof -->
        <div class="footer">
            <div>
                Thời điểm lập báo cáo: <strong>{data['generated_at'][:19].replace('T', ' ')} UTC</strong>
            </div>
            <div>
                Chứng thực băm: <span class="hash-proof">SHA256:{data['audit_proof']['content_hash'][:16]}...</span>
            </div>
        </div>
    </div>
</body>
</html>"""
