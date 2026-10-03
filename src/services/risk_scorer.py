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
from collections.abc import Mapping, Sequence
from typing import Any

# Canonical L3 (Sensitive / Critical under Decree 13/2023/ND-CP)
_L3_KEYWORDS = frozenset(
    {
        "CCCD",
        "CMND",
        "IDENTITY",
        "PASSPORT",
        "BHYT",
        "HEALTH",
        "MEDICAL",
        "ICD10",
        "OCR_TEXT",
        "OCR_IDENTITY_DOC",
        "FREE_TEXT_PII",
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
    }
)

# Canonical L1 (Indirect Identifiers / Quasi-Identifiers)
_L1_KEYWORDS = frozenset(
    {
        "DOB",
        "DATE_OF_BIRTH",
        "GENDER",
        "GIOI_TINH",
        "CITY",
        "DISTRICT",
        "IP_ADDRESS",
        "POSTAL_CODE",
        "QUASI_IDENTIFIER",
    }
)

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

    # Priority 1: Direct L3 match
    if any(k in tax_upper for k in _L3_KEYWORDS) or any(
        _match_path_keyword(k, path_tokens) for k in _L3_KEYWORDS
    ):
        return "L3"
    if c_upper == "PERSONAL_SENSITIVE":
        return "L3"

    # Priority 2: Direct L2 match
    if any(k in tax_upper for k in _L2_KEYWORDS) or any(
        _match_path_keyword(k, path_tokens) for k in _L2_KEYWORDS
    ):
        return "L2"
    if c_upper in {"PERSONAL_BASIC", "PERSONAL_CONTEXT"}:
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


def calculate_risk_score(
    field_profiles: Sequence[Any],
    decisions: Mapping[int, str] | Sequence[Any] | None = None,
    *,
    row_count: int = 1000,
) -> dict[str, Any]:
    """Compute deterministic risk score (0-100), tier, and explanatory drivers.

    Args:
        field_profiles: List of FieldProfile models or dictionaries.
        decisions: Mapping of profile.id -> action, or list of FieldDecision models.
        row_count: Number of records in target dataset (for volume factor).
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
    max_sens_level = "L0"

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

    # Formula: R = 100 * Sens * (0.2 + 0.8 * Cov) * (0.7 + 0.3 * Vol)
    raw_score = 100.0 * sens * (0.2 + 0.8 * cov) * (0.7 + 0.3 * vol)
    score = round(max(0.0, min(100.0, raw_score)), 1)

    # Determine Tier (§9.4): Critical >= 80, High 60-79, Medium 30-59, Low < 30
    if score >= 80.0:
        tier = "Critical"
        action_required = "Cảnh báo ngay (banner + webhook/email)"
    elif score >= 60.0:
        tier = "High"
        action_required = "Cảnh báo"
    elif score >= 30.0:
        tier = "Medium"
        action_required = "Hiển thị trong báo cáo"
    else:
        tier = "Low"
        action_required = "Theo dõi"

    protection_pct = round(((pii_fields - unmasked_pii_fields) / pii_fields) * 100.0, 1) if pii_fields > 0 else 100.0

    return {
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
    }
