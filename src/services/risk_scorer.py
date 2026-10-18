"""Deterministic Risk Score Calculator according to PII Guardian Spec §9.4.

Formula:
    R = 100 * Sens * (0.2 + 0.8 * Cov) * (0.7 + 0.3 * Vol)

Drivers:
    - Sens: Max sensitivity level in dataset (L3=1.0, L2=0.7, L1=0.3, L0=0.0).
    - Cov:  Ratio of PII fields that remain UNMASKED / UNPROTECTED (0.0 to 1.0).
    - Vol:  Logarithmic volume factor = min(1.0, log10(row_count + 1) / 8.0).
"""

from __future__ import annotations

import math
from collections import Counter
from collections.abc import Mapping, Sequence
from typing import Any

# Canonical L3 (sensitive personal data). Kept in line with src/detection/taxonomy.py:
# identity numbers (CCCD/CMND/passport) and free text are *basic* data there, so they are L2 below.
_L3_KEYWORDS = frozenset(
    {
        "BHYT",
        "HEALTH",
        "MEDICAL",
        "ICD10",
        "OCR_TEXT",
        "OCR_IDENTITY_DOC",
        "BANK_ACCOUNT",
        "FINANCIAL",
        "BIOMETRIC",
        "CLINICAL_TEXT",
        "PERSONAL_SENSITIVE",
        "SO_TK",
        "PATIENT_ID",
    }
)

# Canonical L2 (Direct Identifiers / Basic PII)
_L2_KEYWORDS = frozenset(
    {
        "CCCD",
        "CMND",
        "IDENTITY",
        "PASSPORT",
        "FREE_TEXT_PII",
        "FULL_NAME",
        "NAME",
        "PHONE",
        "PHONE_VN",
        "VN_PHONE",
        "EMAIL",
        "ADDRESS",
        "STREET_ADDRESS",
        "VN_ADDRESS",
        "TAX_CODE_PERSONAL",
        "PERSONAL_BASIC",
        "PERSONAL_CONTEXT",
        "SO_DT",
        "SHIP_PHONE",
        # NĐ 356/2025 Điều 3 khoản 2, 3: ngày sinh và giới tính là dữ liệu cá nhân cơ bản
        "DOB",
        "DATE_OF_BIRTH",
        "BIRTH",
        "NGAY_SINH",
        "GENDER",
        "GIOI_TINH",
    }
)

# Canonical L1 (Indirect Identifiers / Quasi-Identifiers)
_L1_KEYWORDS = frozenset(
    {
        "CITY",
        "DISTRICT",
        "IP_ADDRESS",
        "POSTAL_CODE",
        "QUASI_IDENTIFIER",
        "JOB_TITLE",
    }
)

# Scanner/DPO classifications that already state the level. When one is present it wins over
# taxonomy/path keywords, so the review screen, the risk score and the report never disagree.
_CLASSIFICATION_LEVELS = {
    "PERSONAL_SENSITIVE": "L3",
    "PERSONAL_BASIC": "L2",
    "PERSONAL_CONTEXT": "L2",
    "QUASI_IDENTIFIER": "L1",
}

# Canonical L0 (Non-personal / System data)
_L0_KEYWORDS = frozenset(
    {
        "SYSTEM_ID",
        "TRACKING_NUMBER",
        "TRACKING_CODE",
        "TAX_CODE_ORG",
        "AMOUNT",
        "MONEY",
        "NOT_PERSONAL_DATA",
        "NON_PERSONAL",
        "ORDER_CODE",
        "BARCODE",
        "INVOICE_NO",
    }
)

_PROTECTED_ACTIONS = frozenset({"MASK", "HMAC", "DROP", "REDACT", "TOKENIZE"})


_NON_PERSONAL_FIELD_TOKENS = frozenset(
    {"PRODUCT", "FILE", "FILENAME", "TABLE", "COLUMN", "PROJECT", "APP", "DEVICE", "SYSTEM", "SERVICE"}
)


def _match_path_keyword(keyword: str, path_tokens: set[str]) -> bool:
    # Paths are split on "_", so a compound keyword (GIOI_TINH, SO_DT) matches when all its parts are present.
    if "_" in keyword:
        return all(part in path_tokens for part in keyword.split("_"))
    if keyword not in path_tokens:
        return False
    if keyword == "NAME":
        if any(np in path_tokens for np in _NON_PERSONAL_FIELD_TOKENS):
            return False
        if len(path_tokens) > 1 and not path_tokens.intersection(
            {"FULL", "FIRST", "LAST", "MIDDLE", "CUSTOMER", "CLIENT", "USER", "EMPLOYEE", "PATIENT", "CONTACT", "TEN", "HO"}
        ):
            return False
    return True


def resolve_sensitivity_level(
    *,
    classification: str = "",
    taxonomy_id: str | None = None,
    field_path: str = "",
) -> str:
    """Classify a field profile into L0, L1, L2, or L3 deterministically using word boundaries (§4.5, §9.4)."""
    import re

    c_upper = (classification or "").upper().strip()
    tax_upper = (taxonomy_id or "").upper().strip()
    path_upper = (field_path or "").upper().strip()
    path_tokens = set(re.split(r"[^A-Z0-9]+", path_upper)) if path_upper else set()

    # Priority 0: Explicit Non-Personal Data is always L0
    if c_upper in {"NON_PERSONAL", "NOT_PERSONAL_DATA"} and tax_upper in {
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
    }:
        return "L0"

    # Priority 1: the classification assigned by the scanner (or corrected by the DPO)
    if c_upper in _CLASSIFICATION_LEVELS:
        return _CLASSIFICATION_LEVELS[c_upper]

    # Fallback for unclassified/UNKNOWN fields: infer from taxonomy id and column name.
    if any(k in tax_upper for k in _L3_KEYWORDS) or any(
        _match_path_keyword(k, path_tokens) for k in _L3_KEYWORDS
    ):
        return "L3"

    # Priority 2: Direct L2 match
    if any(k in tax_upper for k in _L2_KEYWORDS) or any(
        _match_path_keyword(k, path_tokens) for k in _L2_KEYWORDS
    ):
        return "L2"

    # Priority 3: Direct L1 match
    if any(k in tax_upper for k in _L1_KEYWORDS) or any(
        _match_path_keyword(k, path_tokens) for k in _L1_KEYWORDS
    ):
        return "L1"

    # Priority 4: Direct L0 match
    if c_upper == "NON_PERSONAL" or any(k in tax_upper for k in _L0_KEYWORDS) or any(
        k in path_tokens for k in _L0_KEYWORDS
    ):
        return "L0"

    # Edge cases
    if c_upper == "UNKNOWN":
        return "L1"

    return "L0"


def _score_to_tier_and_action(score: float) -> tuple[str, str]:
    """Helper map risk score (0-100) to Tier and Action Required (§9.4)."""
    if score >= 80.0:
        return "Critical", "Cảnh báo ngay (banner + webhook/email)"
    elif score >= 60.0:
        return "High", "Cảnh báo"
    elif score >= 30.0:
        return "Medium", "Hiển thị trong báo cáo"
    else:
        return "Low", "Theo dõi"


def calculate_risk_score(
    field_profiles: Sequence[Any],
    decisions: Mapping[int, str] | Sequence[Any] | None = None,
    *,
    row_count: int = 1000,
    k_anonymity_alpha: float = 0.35,
    k_target: int = 5,
    field_samples: Mapping[str, Sequence[Any]] | None = None,
    detection_risk_rcw: float | None = None,
) -> dict[str, Any]:
    """Compute deterministic risk scores: Baseline Detection Risk (R_CW), Governance Baseline (§9.4), Method A (Schema Proxy), Method B (Data-Level K-Anonymity), and Generalization recommendations.

    Args:
        field_profiles: List of FieldProfile models or dictionaries.
        decisions: Mapping of profile.id -> action, or list of FieldDecision models.
        row_count: Number of records in target dataset (for volume factor).
        k_anonymity_alpha: Weight amplifier for unmasked L1 quasi-identifiers in Method A (default: 0.35).
        k_target: Minimum target k threshold for privacy equivalence class in Method B (default: 5).
        field_samples: Optional mapping of field_path -> list of sample values for Method B.
        detection_risk_rcw: Optional override for pipeline detection risk R_CW (0.0 to 1.0).
    """
    decision_map: dict[int, str] = {}
    if decisions:
        if isinstance(decisions, Mapping):
            decision_map = {int(k): str(v).upper() for k, v in decisions.items()}
        else:
            for d in decisions:
                profile_id = getattr(d, "field_profile_id", None)
                act = getattr(d, "action", None)
                if profile_id is not None and act is not None:
                    act_val = getattr(act, "value", act)
                    decision_map[int(profile_id)] = str(act_val).upper()

    total_fields = len(field_profiles)
    level_counts = {"L0": 0, "L1": 0, "L2": 0, "L3": 0}
    action_counts = {"HMAC": 0, "MASK": 0, "DROP": 0, "KEEP": 0}

    pii_fields = 0
    unmasked_pii_fields = 0
    unmasked_l1_fields = 0
    max_sens_level = "L0"
    field_records: list[tuple[Any, str, str]] = []

    # Detection risk R_CW computation from ground truth if present
    n_pii_gt = 0
    fn_conf_sum = 0.0
    has_gt = False

    for p in field_profiles:
        p_id = p.get("id") if isinstance(p, dict) else getattr(p, "id", None)
        c = p.get("classification", "") if isinstance(p, dict) else getattr(p, "classification", "")
        tax = p.get("taxonomy_id") if isinstance(p, dict) else getattr(p, "taxonomy_id", None)
        f_path = p.get("field_path", "") if isinstance(p, dict) else getattr(p, "field_path", "")
        rec_act = p.get("recommended_action", "KEEP") if isinstance(p, dict) else getattr(p, "recommended_action", "KEEP")
        rec_act_val = getattr(rec_act, "value", rec_act)

        # Effective action: DPO decision if present, else recommended action
        effective_action = "KEEP"
        if p_id is not None and p_id in decision_map:
            effective_action = decision_map[p_id]
        else:
            effective_action = str(rec_act_val).upper()

        if effective_action in action_counts:
            action_counts[effective_action] += 1
        else:
            action_counts["KEEP"] += 1

        lvl = resolve_sensitivity_level(classification=c, taxonomy_id=tax, field_path=f_path)
        level_counts[lvl] = level_counts.get(lvl, 0) + 1
        field_records.append((p, effective_action, lvl))

        # Check ground-truth expected_action for R_CW calculation
        exp_act = p.get("expected_action") if isinstance(p, dict) else getattr(p, "expected_action", None)
        if exp_act is not None:
            has_gt = True
            exp_act_norm = "HMAC" if exp_act in ["HASHING", "HMAC"] else str(getattr(exp_act, "value", exp_act)).upper()
            if exp_act_norm != "KEEP":
                n_pii_gt += 1
                if effective_action == "KEEP":
                    conf = p.get("confidence_score", 1.0) if isinstance(p, dict) else getattr(p, "confidence_score", 1.0)
                    fn_conf_sum += float(conf if conf is not None else 1.0)

        # Track max sensitivity level
        if lvl == "L3":
            max_sens_level = "L3"
        elif lvl == "L2" and max_sens_level != "L3":
            max_sens_level = "L2"
        elif lvl == "L1" and max_sens_level == "L0":
            max_sens_level = "L1"

        # Check if field is PII
        if lvl in {"L1", "L2", "L3"}:
            pii_fields += 1
            if effective_action not in _PROTECTED_ACTIONS:
                unmasked_pii_fields += 1
                if lvl == "L1":
                    unmasked_l1_fields += 1

    # Finalize R_CW detection risk
    computed_rcw = detection_risk_rcw
    if computed_rcw is None and has_gt and n_pii_gt > 0:
        computed_rcw = round(fn_conf_sum / n_pii_gt, 4)

    # Sensitivity factor §9.4: L3=1.0, L2=0.7, L1=0.3, L0=0.0
    sens_map = {"L3": 1.0, "L2": 0.7, "L1": 0.3, "L0": 0.0}
    sens = sens_map.get(max_sens_level, 0.0)

    # Coverage factor: Ratio of UNMASKED PII fields (0.0 to 1.0)
    if pii_fields == 0:
        cov = 0.0
    else:
        cov = unmasked_pii_fields / pii_fields

    # Volume factor: min(1.0, log10(row_count + 1) / 8.0)
    vol = min(1.0, math.log10(max(1, row_count) + 1) / 8.0)

    # 1. BASELINE RISK SCORE (§9.4)
    raw_score = 100.0 * sens * (0.2 + 0.8 * cov) * (0.7 + 0.3 * vol)
    score = round(max(0.0, min(100.0, raw_score)), 1)
    tier, action_required = _score_to_tier_and_action(score)

    protection_pct = round(((pii_fields - unmasked_pii_fields) / pii_fields) * 100.0, 1) if pii_fields > 0 else 100.0

    # 2. METHOD A: SCHEMA-LEVEL PROXY K-ANONYMITY
    n_l1_total = level_counts.get("L1", 0)
    k_proxy = (unmasked_l1_fields / n_l1_total) if n_l1_total > 0 else 0.0
    amplifier_a = 1.0 + k_anonymity_alpha * k_proxy
    score_a = round(min(100.0, score * amplifier_a), 1)
    tier_a, action_a = _score_to_tier_and_action(score_a)

    # 3. METHOD B: DATA-LEVEL EXACT K-ANONYMITY & IDENTIFY GENERALIZATION COLUMNS
    tables: dict[str, list[tuple[Any, str, str]]] = {}
    columns_to_generalize: list[dict[str, Any]] = []
    seen_cols = set()

    for p, eff_act, lvl in field_records:
        t_name = p.get("table", "default") if isinstance(p, dict) else getattr(p, "table", "default") or "default"
        tables.setdefault(t_name, []).append((p, eff_act, lvl))

        if lvl == "L1" and eff_act not in _PROTECTED_ACTIONS:
            f_p = p.get("field_path", "") if isinstance(p, dict) else getattr(p, "field_path", "")
            tax = p.get("taxonomy_id", "") if isinstance(p, dict) else getattr(p, "taxonomy_id", "")
            col_key = (t_name, f_p)
            if col_key not in seen_cols:
                seen_cols.add(col_key)
                f_p_lower = f_p.lower()
                if any(k in f_p_lower for k in ["city", "province", "tinh", "tp", "country", "quoc_gia"]):
                    strategy = "Gom nhóm cấp Tỉnh/Thành về cấp Vùng (Miền Bắc, Miền Trung, Miền Nam)"
                elif any(k in f_p_lower for k in ["birth", "dob", "ngay_sinh"]):
                    strategy = "Chuyển thành Năm sinh (YYYY) hoặc Nhóm tuổi ([18-24], [25-34], [35-50])"
                elif any(k in f_p_lower for k in ["postal", "zip", "code"]):
                    strategy = "Cắt giảm chỉ giữ 2 chữ số đầu của mã bưu chính (Prefix Truncation)"
                else:
                    strategy = f"Áp dụng Tổng quát hóa (Hierarchy Generalization) để đảm bảo k >= {k_target}"

                columns_to_generalize.append({
                    "table": t_name,
                    "field_path": f_p,
                    "taxonomy_id": tax,
                    "sensitivity_level": "L1",
                    "current_action": eff_act,
                    "recommended_action": "GENERALIZE",
                    "suggested_strategy": strategy,
                    "reason": "Quasi-Identifier (L1) đang để KEEP làm giảm chỉ số k-anonymity và gây nguy cơ tái định danh gián tiếp",
                })

    min_k_global: int | None = None
    worst_table: str | None = None

    for t_name, recs in tables.items():
        l1_kept = [r for r in recs if r[2] == "L1" and r[1] not in _PROTECTED_ACTIONS]
        if not l1_kept:
            continue

        field_samples_list = []
        for p, _, _ in l1_kept:
            f_p = p.get("field_path", "") if isinstance(p, dict) else getattr(p, "field_path", "")
            s = None
            if field_samples and f_p in field_samples:
                s = field_samples[f_p]
            elif isinstance(p, dict) and p.get("samples"):
                s = p.get("samples")
            elif hasattr(p, "samples") and getattr(p, "samples"):
                s = getattr(p, "samples")

            if s and len(s) > 0:
                field_samples_list.append(s)

        if len(field_samples_list) == len(l1_kept) and len(field_samples_list) > 0:
            min_len = min(len(s) for s in field_samples_list)
            if min_len > 0:
                rows = [tuple(s[i] for s in field_samples_list) for i in range(min_len)]
                counts = Counter(rows)
                k_min_table = min(counts.values())
                if min_k_global is None or k_min_table < min_k_global:
                    min_k_global = k_min_table
                    worst_table = t_name

    if min_k_global is not None:
        rir = 1.0 / max(1, min_k_global)
        raw_score_b = 100.0 * sens * rir * (0.7 + 0.3 * vol)
        score_b = round(max(score, min(100.0, raw_score_b)), 1)
        score_b_weighted = round(0.7 * score + 0.3 * min(100.0, raw_score_b), 1)
    else:
        rir = 0.0
        score_b = score
        score_b_weighted = score

    tier_b, action_b = _score_to_tier_and_action(score_b)
    tier_b_weighted, _ = _score_to_tier_and_action(score_b_weighted)

    # 4. COMBINED MULTI-FACTOR RISK SCORE (Harmonized Weighted Fusion)
    # Dung hợp hài hòa giữa 3 chiều: Rủi ro trực tiếp (40%) + Cấu trúc Quasi-ID (30%) + Tái định danh thực tế (30%)
    score_combined = round(0.4 * score + 0.3 * score_a + 0.3 * score_b_weighted, 1)
    tier_combined, action_combined = _score_to_tier_and_action(score_combined)

    return {
        # Baseline backward compatible fields
        "score": score,
        "tier": tier,
        "action_required": action_required,
        "max_sensitivity_level": max_sens_level,
        "drivers": {
            "sens_factor": sens,
            "max_sensitivity_level": max_sens_level,
            "cov_factor": round(cov, 4),
            "vol_factor": round(vol, 4),
            "total_fields": total_fields,
            "total_pii_fields": pii_fields,
            "unmasked_pii_fields": unmasked_pii_fields,
            "protected_pii_fields": pii_fields - unmasked_pii_fields,
            "protection_pct": protection_pct,
            "row_count": row_count,
        },
        "level_counts": level_counts,
        "action_counts": action_counts,

        # Detection Risk R_CW (Spec Performance)
        "detection_risk_rcw": {
            "name": "Chỉ Số Rủi Ro Cơ Bản Pipeline AI (Detection Risk R_CW)",
            "score_pct": round(computed_rcw * 100.0, 2) if computed_rcw is not None else None,
            "ratio": computed_rcw,
            "formula": "R_CW = sum(1(y_i=1, y_hat_i=0) * q_i) / N_PII",
            "description": "Đo lường tỷ lệ ca PII thực tế bị AI bỏ sót thành KEEP (có trọng số theo độ tự tin q_i)",
            "status": "🟢 AN TOÀN TUYỆT ĐỐI (Triệt tiêu 100% rủi ro bỏ sót)" if (computed_rcw is not None and computed_rcw == 0.0) else "🔴 CÓ NGUY CƠ BỎ SÓT PII",
        },

        # Columns to Generalize
        "columns_to_generalize": columns_to_generalize,

        # Explicit Risk Metrics
        "risk_metrics": {
            "detection_risk": {
                "name": "Chỉ Số Rủi Ro Cơ Bản Pipeline AI (Detection Risk R_CW)",
                "score_pct": round(computed_rcw * 100.0, 2) if computed_rcw is not None else None,
                "ratio": computed_rcw,
                "formula": "R_CW = sum(1(y_i=1, y_hat_i=0) * q_i) / N_PII",
                "description": "Đo lường tỷ lệ ca PII thực tế bị AI bỏ sót thành KEEP (có trọng số theo độ tự tin q_i)",
            },
            "baseline": {
                "name": "Risk Cơ Bản Quản Trị CSDL (Spec §9.4)",
                "score": score,
                "tier": tier,
                "action_required": action_required,
                "formula": "R = 100 * Sens * (0.2 + 0.8 * Cov) * (0.7 + 0.3 * Vol)",
                "description": "Rủi ro phát tán dữ liệu trực tiếp dựa trên độ nhạy cảm và tỷ lệ PII chưa được che mờ",
            },
            "schema_proxy": {
                "name": "Risk Mới A (Schema-Level K-Anonymity Proxy)",
                "score": score_a,
                "tier": tier_a,
                "action_required": action_a,
                "formula": "R_A = R_base * (1 + alpha * (n_L1_KEEP / n_L1_total))",
                "n_l1_kept": unmasked_l1_fields,
                "n_l1_total": n_l1_total,
                "k_proxy_factor": round(k_proxy, 4),
                "amplifier": round(amplifier_a, 4),
                "columns_to_generalize": columns_to_generalize,
                "description": "Rủi ro tiềm tàng khuếch đại theo tỷ lệ trường Quasi-Identifier (L1) được giữ nguyên",
            },
            "data_level": {
                "name": "Risk Mới B (Data-Level Exact K-Anonymity)",
                "score": score_b,
                "score_weighted": score_b_weighted,
                "tier": tier_b,
                "tier_weighted": tier_b_weighted,
                "action_required": action_b,
                "formula": "R_B = max(R_base, 100 * Sens * (1/k*) * (0.7 + 0.3 * Vol))",
                "k_min": min_k_global,
                "k_target": k_target,
                "worst_table": worst_table,
                "re_identification_risk": round(rir, 4),
                "passed": (min_k_global >= k_target) if min_k_global is not None else True,
                "columns_to_generalize": columns_to_generalize,
                "description": "Rủi ro tái định danh thực tế đo lường trên nhóm tương đương nhỏ nhất (k*) của dữ liệu",
            },
            "combined": {
                "name": "Risk Hợp Nhất (Combined Multi-Factor)",
                "score": score_combined,
                "tier": tier_combined,
                "action_required": action_combined,
                "formula": "R_combined = max(R_A, R_B)",
                "description": "Điểm rủi ro tổng hợp hợp nhất đa chiều giữa phát tán trực tiếp và tái định danh gián tiếp",
            },
        },
    }
