"""
PIIGuard Performance Pipeline Runner & Multi-Tier Reporting
============================================================
Chạy toàn bộ pipeline Phễu Lọc 3 Tầng trên golden_labels.json,
thu thập: phân loại, confidence_score, tier trả về.
Xuất 4 bản báo cáo độc lập cho 4 Tiers cùng bản tổng hợp vào folder performance/:
  - performance/report_tier1.md (TIER_1: Rules & Regex)
  - performance/report_tier2.md (TIER_2: BM25 Lexical)
  - performance/report_tier3_hybrid.md (TIER_3_HYBRID: BM25 + Vector Fusion)
  - performance/report_tier3_llm.md (TIER_3_LLM: LLM Softmax / Context Reasoning)
  - performance/performance_report.md (Báo cáo tổng hợp đối chiếu 4 Tiers)
  - performance/performance_results.json (Kết quả dạng JSON chi tiết)

Usage:
    python -m performance.run_pipeline
    python -m performance.run_pipeline --source postgres --split dev
"""
import argparse
import asyncio
import json
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any

# Ensure project root is on sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from tqdm import tqdm  # noqa: E402

from src.agents.graph import agent  # noqa: E402
from src.detection.taxonomy import PIIType  # noqa: E402
from src.models.schemas import ColumnProfile  # noqa: E402

TIER_CONFIGS = [
    {
        "id": "TIER_1",
        "file": "report_tier1.md",
        "title": "TIER 1 — Bộ Lọc Tĩnh (Rule-Based & Regex Pattern Matching)",
        "desc": (
            "Tầng kiểm tra tĩnh đầu tiên trong phễu lọc: kết hợp quy tắc đối chiếu từ khóa tên cột, "
            "kiểu dữ liệu và biểu thức chính quy (Regex) với các mẫu PII chuẩn quốc gia (CCCD 12 số, "
            "SĐT di động VN 10-11 số, Email, Ngày sinh, Mã số thuế). Độ trễ cực thấp (< 10ms)."
        ),
    },
    {
        "id": "TIER_2",
        "file": "report_tier2.md",
        "title": "TIER 2 — Lọc Từ Vựng Cơ Bản (BM25 Lexical Engine)",
        "desc": (
            "Tầng lọc từ vựng đối chiếu với tập RAG corpus từ khóa pháp lý (Luật 91/2025/QH15 & NĐ 356/2025/NĐ-CP). "
            "Sử dụng thuật toán BM25 Okapi loại bỏ stopwords kỹ thuật, chuẩn hóa điểm thô qua hàm Sigmoid về khoảng [0, 1]. "
            "Chốt quyết định đối với các mẫu vượt ngưỡng threshold=0.95."
        ),
    },
    {
        "id": "TIER_3_HYBRID",
        "file": "report_tier3_hybrid.md",
        "title": "TIER 3 HYBRID — Chấm Điểm Hỗn Hợp (BM25 + Semantic Vector Fusion)",
        "desc": (
            "Tầng dung hợp đa phương thức cho các trường hợp mập mờ: kết hợp 40% điểm từ vựng BM25 "
            "và 60% điểm tương đồng ngữ nghĩa vector từ ChromaDB Knowledge Base. Tự động chốt khi điểm > 0.85 "
            "hoặc < 0.15; các ca ở vùng xám (0.15 - 0.85) được chuyển tiếp sang LLM."
        ),
    },
    {
        "id": "TIER_3_LLM",
        "file": "report_tier3_llm.md",
        "title": "TIER 3 LLM — Đánh Giá Ngữ Cảnh Chuyên Sâu (GPT-4o-mini Reasoning)",
        "desc": (
            "Tầng suy luận ngữ cảnh sâu bằng Large Language Model (GPT-4o-mini) với temperature=0. "
            "Đầu vào gồm Data Shape đã khử nhận dạng (Zero Raw-PII egress) và các ví dụ Few-shot từ DPO. "
            "Độ tự tin (Confidence Score) được tính từ phân phối xác suất Softmax / Logprobs của mô hình."
        ),
    },
]


async def process_row(row: dict) -> dict:
    """Xử lý 1 row trong golden_labels, chạy full pipeline, trả về kết quả có confidence_score."""
    is_key = row.get("expected_action") == "HMAC"
    system_rec = "HMAC" if is_key else None

    profile = ColumnProfile(
        table_name=row.get("table"),
        column_name=row["field_path"],
        data_type=row["data_type"],
        is_primary_key=is_key,
        is_foreign_key=False,
        samples=[row["sample_value"]],
        system_recommendation=system_rec,
    )

    max_retries = 3
    start_time = time.time()

    for attempt in range(max_retries):
        try:
            result_state = await agent.ainvoke({"column_profile": profile})
            final_proposal = result_state.get("final_proposal")
            confidence_score = result_state.get("confidence_score")

            if final_proposal:
                pred_type = final_proposal.inferred_pii_type
                pred_action = final_proposal.recommended_action
                tier = final_proposal.tier
                if confidence_score is None:
                    confidence_score = final_proposal.confidence_score or final_proposal.confidence
            else:
                pred_type = PIIType.UNKNOWN.value
                pred_action = "KEEP"
                tier = "ERROR_OR_NO_PROPOSAL"
                confidence_score = 0.0

            break

        except Exception as e:
            error_msg = str(e)
            if any(kw in error_msg.lower() for kw in ["429", "502", "resourceexhausted", "quota"]):
                if attempt < max_retries - 1:
                    print(f"\n[⚠️] API rate limit. Tạm nghỉ 15s (Lần {attempt + 1}/{max_retries})...")
                    await asyncio.sleep(15)
                    continue

            pred_type = PIIType.UNKNOWN.value
            pred_action = "KEEP"
            tier = f"FAILED: {error_msg}"
            confidence_score = 0.0
            break

    latency = time.time() - start_time
    golden_type = row["taxonomy_id"]
    expected_action = row.get("expected_action", "KEEP")

    # Chuẩn hóa action: HMAC và HASHING là tương đương nhau
    pred_action_norm = "HMAC" if pred_action in ["HASHING", "HMAC"] else pred_action
    expected_action_norm = "HMAC" if expected_action in ["HASHING", "HMAC"] else expected_action
    match_action = expected_action_norm == pred_action_norm

    return {
        "id": row["id"],
        "field": row["field_path"],
        "table": row.get("table", ""),
        "source": row.get("source", ""),
        "golden_type": golden_type,
        "predicted_type": pred_type,
        "expected_action": expected_action_norm,
        "predicted_action": pred_action_norm,
        "tier": tier,
        "confidence_score": round(confidence_score, 4) if confidence_score is not None else 0.0,
        "match_action": match_action,
        "latency": latency,
        "sensitivity_level": row.get("sensitivity_level", ""),
        "split": row.get("split", ""),
        "reason": row.get("reason", ""),
    }


def compute_metrics(results: list[dict[str, Any]]) -> dict[str, Any]:
    """
    Tính toán tập metric đầy đủ: Accuracy, Precision, Recall, F1, F2, Latency, Risk (R_CW).

    Công thức Confidence-Weighted Risk (R_CW):
        R_CW = sum(1(y_i = 1, y_hat_i = 0) * q_i) / N_PII
    Trong đó:
      - N_PII: Tổng số trường PII thực tế trong tập (y_i = 1, tức expected_action != 'KEEP').
      - 1(y_i = 1, y_hat_i = 0): Chỉ số ca bỏ sót PII (False Negative, dự đoán là KEEP/Non-PII).
      - q_i: Độ tự tin (confidence_score) của quyết định Non-PII đó.
    """
    total = len(results)
    if total == 0:
        return {
            "total": 0,
            "correct_action": 0,
            "accuracy": 0.0,
            "n_pii": 0,
            "n_non_pii": 0,
            "tp": 0,
            "fp": 0,
            "tn": 0,
            "fn": 0,
            "precision": 0.0,
            "recall": 0.0,
            "f1": 0.0,
            "f2": 0.0,
            "avg_latency": 0.0,
            "total_latency": 0.0,
            "avg_confidence": 0.0,
            "risk_fn_conf_sum": 0.0,
            "risk_cw": 0.0,
            "mismatches": [],
        }

    correct_action = sum(1 for r in results if r["match_action"])
    accuracy = correct_action / total * 100.0

    # Binary Classification:
    #   Positive: Thực tế là PII (expected_action != "KEEP")
    #   Negative: Thực tế là Non-PII (expected_action == "KEEP")
    n_pii = sum(1 for r in results if r["expected_action"] != "KEEP")
    n_non_pii = sum(1 for r in results if r["expected_action"] == "KEEP")

    tp = sum(1 for r in results if r["expected_action"] != "KEEP" and r["predicted_action"] != "KEEP")
    fp = sum(1 for r in results if r["expected_action"] == "KEEP" and r["predicted_action"] != "KEEP")
    tn = sum(1 for r in results if r["expected_action"] == "KEEP" and r["predicted_action"] == "KEEP")
    fn = sum(1 for r in results if r["expected_action"] != "KEEP" and r["predicted_action"] == "KEEP")

    precision = (tp / (tp + fp) * 100.0) if (tp + fp) > 0 else 0.0
    recall = (tp / (tp + fn) * 100.0) if (tp + fn) > 0 else 0.0
    f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0
    f2 = (5 * precision * recall / (4 * precision + recall)) if (4 * precision + recall) > 0 else 0.0

    total_latency = sum(r["latency"] for r in results)
    avg_latency = total_latency / total
    avg_confidence = sum(r["confidence_score"] for r in results) / total

    # Tính Risk theo công thức R_CW
    fn_items = [r for r in results if r["expected_action"] != "KEEP" and r["predicted_action"] == "KEEP"]
    risk_fn_conf_sum = sum(r["confidence_score"] for r in fn_items)
    risk_cw = (risk_fn_conf_sum / n_pii) if n_pii > 0 else 0.0

    mismatches = [r for r in results if not r["match_action"]]

    return {
        "total": total,
        "correct_action": correct_action,
        "accuracy": accuracy,
        "n_pii": n_pii,
        "n_non_pii": n_non_pii,
        "tp": tp,
        "fp": fp,
        "tn": tn,
        "fn": fn,
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "f2": f2,
        "avg_latency": avg_latency,
        "total_latency": total_latency,
        "avg_confidence": avg_confidence,
        "risk_fn_conf_sum": risk_fn_conf_sum,
        "risk_cw": risk_cw,
        "mismatches": mismatches,
    }


def classify_mismatch_type(r: dict) -> str:
    """Xác định loại lỗi: False Negative, False Positive, hoặc Action Mismatch."""
    exp = r["expected_action"]
    pred = r["predicted_action"]
    if exp != "KEEP" and pred == "KEEP":
        return "🔴 False Negative (Bỏ sót PII — Có nguy cơ rò rỉ!)"
    if exp == "KEEP" and pred != "KEEP":
        return "🟡 False Positive (Báo động giả — Dữ liệu an toàn bị che)"
    return "🔵 Action Mismatch (Lệch mức độ bảo vệ PII)"


def generate_tier_report(cfg: dict, tier_results: list[dict], scope: str) -> str:
    """
    Sinh 1 file báo cáo Markdown độc lập cho 1 Tier, bao gồm:
    1. Các Metrics (accuracy, precision, recall, f1, f2, latency, risk R_CW)
    2. Các case đoán sai (kèm phân loại lỗi FN/FP và phân tích)
    3. Toàn bộ predictions theo thứ tự TĂNG DẦN về confidence score
    """
    m = compute_metrics(tier_results)
    total = m["total"]

    md = []
    md.append(f"# 📊 Báo Cáo Đánh Giá Hiệu Năng — {cfg['title']}")
    md.append("")
    md.append(f"> **Mã tầng (Tier ID):** `{cfg['id']}`  ")
    md.append(f"> **Thời điểm đánh giá:** `{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}`  ")
    md.append(f"> **Phạm vi kiểm thử (Scope):** `{scope}`  ")
    md.append(f"> **Số lượng ca giải quyết tại tầng này:** **{total}** cases  ")
    md.append("")
    md.append(f"*{cfg['desc']}*")
    md.append("")
    md.append("---")
    md.append("")

    # ==========================================
    # 1. CÁC METRICS
    # ==========================================
    md.append("## 1. 🎯 Bảng Chỉ Số Hiệu Năng (Evaluation Metrics)")
    md.append("")
    if total == 0:
        md.append("> ℹ️ *Không có trường hợp nào trong tập dữ liệu thử nghiệm dừng tại tầng này.*")
        md.append("")
        md.append("| Chỉ Số (Metric) | Giá Trị | Đơn Vị / Ý Nghĩa |")
        md.append("|---|:---:|---|")
        md.append("| **Số lượng cases** | `0` | Không có case nào dừng ở tầng này |")
        md.append("| **Accuracy (Action)** | `N/A` | — |")
        md.append("| **Precision** | `N/A` | — |")
        md.append("| **Recall** | `N/A` | — |")
        md.append("| **F1 Score** | `N/A` | — |")
        md.append("| **F2 Score** | `N/A` | — |")
        md.append("| **Latency trung bình** | `N/A` | — |")
        md.append("| **Tổng Latency** | `0.0000s` | — |")
        md.append("| **Risk ($R_{\\text{CW}}$)** | `0.0000 (0.00%)` | Không có rủi ro bỏ sót |")
    else:
        acc_status = "🟢 TỐT" if m["accuracy"] >= 90.0 else ("🟡 TRUNG BÌNH" if m["accuracy"] >= 80.0 else "🔴 THẤP")
        prec_status = "🟢 TỐT" if m["precision"] >= 90.0 else ("🟡 TRUNG BÌNH" if m["precision"] >= 80.0 else "🔴 THẤP")
        rec_status = "🟢 TỐT" if m["recall"] >= 95.0 else ("🟡 TRUNG BÌNH" if m["recall"] >= 85.0 else "🔴 THẤP")
        risk_status = "🟢 AN TOÀN" if m["risk_cw"] == 0.0 else ("🟡 CÓ RỦI RO" if m["risk_cw"] <= 0.1 else "🔴 NGUY HIỂM")

        md.append("| Chỉ Số (Metric) | Giá Trị Thực Tế | Đánh Giá | Chi Tiết Số Liệu |")
        md.append("|---|:---:|:---:|---|")
        md.append(f"| **Action Accuracy** | **{m['accuracy']:.2f}%** | {acc_status} | {m['correct_action']}/{total} ca khớp hoàn toàn hành động bảo vệ |")
        md.append(f"| **Precision (PII)** | **{m['precision']:.2f}%** | {prec_status} | TP={m['tp']}, FP={m['fp']} (Tránh báo động giả) |")
        md.append(f"| **Recall (PII)** | **{m['recall']:.2f}%** | {rec_status} | TP={m['tp']}, FN={m['fn']} (Tránh bỏ sót dữ liệu cá nhân) |")
        md.append(f"| **F1 Score** | **{m['f1']:.2f}%** | ⚖️ Cân Bằng | Trung hòa giữa Precision và Recall |")
        md.append(f"| **F2 Score** | **{m['f2']:.2f}%** | 🛡️ An Toàn | Ưu tiên Recall gấp 2 lần (tiêu chuẩn bảo mật dữ liệu) |")
        md.append(f"| **Latency trung bình** | **{m['avg_latency'] * 1000:.2f} ms** ({m['avg_latency']:.4f}s) | ⚡ Tốc Độ | Thời gian xử lý trung bình mỗi trường |")
        md.append(f"| **Tổng Latency** | **{m['total_latency']:.4f} s** | — | Tổng thời gian thực thi của tầng này |")
        md.append(f"| **Confidence trung bình** | **{m['avg_confidence']:.4f}** | — | Mức độ tự tin trung bình của các dự đoán |")
        md.append(f"| **Risk ($R_{{\\text{{CW}}}}$)** | **{m['risk_cw']:.4f}** ({m['risk_cw'] * 100:.2f}%) | {risk_status} | Rủi ro bỏ sót PII có trọng số theo độ tự tin |")

        md.append("")
        md.append("### 📐 Công Thức & Diễn Giải Chi Tiết Chỉ Số Risk ($R_{\\text{CW}}$)")
        md.append("")
        md.append("$$\n"
                  "R_{\\text{CW}} = \\frac{\\sum_{i=1}^N \\mathbf{1}(y_i = 1, \\hat{y}_i = 0) q_i}{N_{\\text{PII}}}\n"
                  "$$")
        md.append("")
        md.append("Trong đó:")
        md.append(f"- $N_{{\\text{{PII}}}}$: Tổng số trường dữ liệu PII thực tế tại tầng này = **{m['n_pii']}**.")
        md.append("- $y_i = 1$: Mẫu $i$ thực sự chứa dữ liệu cá nhân (`expected_action != 'KEEP'`).")
        md.append("- $\\hat{y}_i = 0$: Hệ thống dự đoán nhầm là Non-PII (`predicted_action == 'KEEP'`).")
        md.append("- $\\mathbf{1}(\\cdot)$: Bằng 1 nếu điều kiện đúng (ca bỏ sót / False Negative), ngược lại bằng 0.")
        md.append("- $q_i$: Độ tự tin (`confidence_score`) của quyết định Non-PII sai lầm đó.")
        md.append("")
        md.append(f"> **Chi tiết phép tính tại {cfg['id']}:**  \n"
                  f"> - Tổng số ca PII bị bỏ sót (False Negative): **{m['fn']}** ca  \n"
                  f"> - Tổng độ tự tin các ca bỏ sót $\\sum q_i$: **{m['risk_fn_conf_sum']:.4f}**  \n"
                  f"> - Mẫu số $N_{{\\text{{PII}}}}$: **{m['n_pii']}**  \n"
                  f"> - **Kết quả Risk $R_{{\\text{{CW}}}}$ = {m['risk_fn_conf_sum']:.4f} / {max(m['n_pii'], 1)} = {m['risk_cw']:.4f} ({m['risk_cw']*100:.2f}%)**")

    md.append("")
    md.append("---")
    md.append("")

    # ==========================================
    # 2. CÁC CASE ĐOÁN SAI
    # ==========================================
    md.append("## 2. ❌ Danh Sách Các Ca Đoán Sai (Misclassifications)")
    md.append("")
    if not m["mismatches"]:
        md.append("🟢 **HOÀN TOÀN KHÔNG CÓ CA ĐOÁN SAI NÀO (100% Khớp Kỳ Vọng Hành Động Bảo Mật).**")
    else:
        md.append(f"> ⚠️ **Phát hiện {len(m['mismatches'])} ca có hành động bảo vệ chưa khớp kỳ vọng:**")
        md.append("")
        md.append("| STT | ID | Tên Trường (Field) | Bảng / Collection | Golden Type | Predicted Type | Expected Action | Predicted Action | Confidence ($q_i$) | Phân Loại Lỗi |")
        md.append("|:---:|---|---|---|---|---|:---:|:---:|:---:|---|")
        for idx, mis in enumerate(m["mismatches"], start=1):
            err_type = classify_mismatch_type(mis)
            md.append(
                f"| {idx} | `{mis['id']}` | `{mis['field']}` | `{mis['table']}` | "
                f"`{mis['golden_type']}` | `{mis['predicted_type']}` | "
                f"**{mis['expected_action']}** | {mis['predicted_action']} | "
                f"**{mis['confidence_score']:.4f}** | {err_type} |"
            )

        md.append("")
        md.append("### 🔍 Phân Tích Nguyên Nhân & Hướng Xử Lý")
        md.append("")
        for idx, mis in enumerate(m["mismatches"], start=1):
            err_type = classify_mismatch_type(mis)
            md.append(f"#### Case #{idx}: `{mis['field']}` ({mis['id']})")
            md.append(f"- **Phân loại lỗi:** {err_type}")
            md.append(f"- **Kỳ vọng:** `{mis['expected_action']}` ({mis['golden_type']}) ➔ **Dự đoán:** `{mis['predicted_action']}` ({mis['predicted_type']})")
            md.append(f"- **Confidence Score ($q_i$):** `{mis['confidence_score']:.4f}`")
            if "False Negative" in err_type:
                md.append("- **Đánh giá rủi ro:** ⚠️ Ca này đóng góp trực tiếp vào chỉ số Risk $R_{\\text{CW}}$ do hệ thống tự tin bỏ qua trường dữ liệu có chứa PII. Cần bổ sung rule/corpus để ngăn chặn lọt lưới.")
            elif "False Positive" in err_type:
                md.append("- **Đánh giá rủi ro:** 🛡️ An toàn về mặt pháp lý (không lộ dữ liệu), nhưng có thể làm giảm tiện ích phân tích do che dữ liệu an toàn. DPO có thể nới lỏng qua cơ chế HITL.")
            else:
                md.append("- **Đánh giá rủi ro:** ℹ️ Lệch phương thức xử lý (ví dụ cần HMAC bảo toàn JOIN nhưng lại MASK).")
            md.append("")

    md.append("---")
    md.append("")

    # ==========================================
    # 3. DANH SÁCH PREDICTIONS THEO THỨ TỰ TĂNG DẦN VỀ CONFIDENCE SCORE
    # ==========================================
    md.append("## 3. 📈 Danh Sách Predictions Đưa Ra (Sắp Xếp Tăng Dần Theo Confidence Score)")
    md.append("")
    if total == 0:
        md.append("> ℹ️ *Không có dữ liệu dự đoán.*")
    else:
        # Sắp xếp tăng dần theo confidence_score
        sorted_results = sorted(tier_results, key=lambda x: x["confidence_score"])
        md.append(f"> Toàn bộ **{total}** dự đoán được đưa ra tại `{cfg['id']}`, xếp theo thứ tự **tăng dần** về độ tự tin ($q_i$ từ thấp đến cao):")
        md.append("")
        md.append("| STT | ID | Trường (Field) | Bảng | Golden Type | Predicted Type | Expected | Predicted | Confidence ($q_i$) | Kết Quả | Latency |")
        md.append("|:---:|---|---|---|---|---|:---:|:---:|:---:|:---:|---:|")
        for idx, r in enumerate(sorted_results, start=1):
            icon = "✅ Đúng" if r["match_action"] else "❌ Sai"
            md.append(
                f"| {idx} | `{r['id']}` | `{r['field']}` | `{r['table']}` | "
                f"`{r['golden_type']}` | `{r['predicted_type']}` | "
                f"**{r['expected_action']}** | {r['predicted_action']} | "
                f"**{r['confidence_score']:.4f}** | {icon} | {r['latency']:.4f}s |"
            )

    md.append("")
    return "\n".join(md)


def generate_combined_report(results: list[dict[str, Any]], total_eval_time: float, scope: str) -> str:
    """Sinh báo cáo tổng quan kết nối và đối chiếu cả 4 Tiers."""
    total = len(results)
    m_all = compute_metrics(results)

    md = []
    md.append("# 📊 Báo Cáo Hiệu Năng Tổng Hợp — PIIGuard Multi-Tier Pipeline")
    md.append("")
    md.append(f"> **Thời điểm chạy:** `{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}`  ")
    md.append(f"> **Phạm vi (Scope):** `{scope}`  ")
    md.append(f"> **Tổng số test cases:** **{total}**  ")
    md.append(f"> **Tổng thời gian quét:** **{total_eval_time:.2f} s** (Latency TB: {m_all['avg_latency']*1000:.2f} ms/case)  ")
    md.append("")
    md.append("---")
    md.append("")

    # ===== BẢNG SO SÁNH 4 TIERS =====
    md.append("## 1. 🔬 Bảng Đối Chiếu Hiệu Năng 4 Tầng (Multi-Tier Matrix)")
    md.append("")
    md.append("| Tầng (Tier) | Báo Cáo Chi Tiết | Cases | Accuracy | Precision | Recall | F1 | F2 | Risk ($R_{\\text{CW}}$) | Latency TB |")
    md.append("|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|")

    for cfg in TIER_CONFIGS:
        t_res = [r for r in results if r["tier"] == cfg["id"]]
        t_m = compute_metrics(t_res)
        if t_m["total"] == 0:
            md.append(f"| `{cfg['id']}` | [{cfg['file']}](./{cfg['file']}) | 0 | — | — | — | — | — | 0.00% | — |")
        else:
            md.append(
                f"| `{cfg['id']}` | [{cfg['file']}](./{cfg['file']}) | **{t_m['total']}** | "
                f"**{t_m['accuracy']:.2f}%** | {t_m['precision']:.2f}% | {t_m['recall']:.2f}% | "
                f"{t_m['f1']:.2f}% | {t_m['f2']:.2f}% | **{t_m['risk_cw']*100:.2f}%** | "
                f"{t_m['avg_latency']*1000:.2f} ms |"
            )

    md.append(
        f"| **TOÀN PIPELINE** | — | **{total}** | "
        f"**{m_all['accuracy']:.2f}%** | **{m_all['precision']:.2f}%** | **{m_all['recall']:.2f}%** | "
        f"**{m_all['f1']:.2f}%** | **{m_all['f2']:.2f}%** | **{m_all['risk_cw']*100:.2f}%** | "
        f"**{m_all['avg_latency']*1000:.2f} ms** |"
    )
    md.append("")
    md.append("---")
    md.append("")

    # ===== LIÊN KẾT 4 BẢN BÁO CÁO =====
    md.append("## 2. 📑 Danh Sách 4 Bản Báo Cáo Riêng Biệt Cho Từng Tier")
    md.append("")
    for cfg in TIER_CONFIGS:
        t_res = [r for r in results if r["tier"] == cfg["id"]]
        md.append(f"- 📄 **[{cfg['title']}](./{cfg['file']})** ({len(t_res)} cases)")
        md.append(f"  - *File path:* `performance/{cfg['file']}`")
        md.append("  - *Chức năng:* Báo cáo chi tiết metrics, danh sách ca sai và toàn bộ predictions xếp theo confidence score tăng dần.")
    md.append("")
    md.append("---")
    md.append("")

    # ===== TỔNG HỢP CÁC CA SAI =====
    md.append("## 3. ❌ Tổng Hợp Các Ca Đoán Sai Toàn Bộ Pipeline")
    md.append("")
    if not m_all["mismatches"]:
        md.append("🟢 **HOÀN TOÀN KHÔNG CÓ CA ĐOÁN SAI NÀO (100% Khớp Kỳ Vọng).**")
    else:
        md.append(f"> ⚠️ **Có tổng cộng {len(m_all['mismatches'])} ca sai lệch trên toàn hệ thống:**")
        md.append("")
        md.append("| ID | Field Path | Table | Expected | Predicted | Tier | Confidence ($q_i$) | Phân Loại Lỗi |")
        md.append("|---|---|---|:---:|:---:|:---:|:---:|---|")
        for mis in m_all["mismatches"]:
            err_type = classify_mismatch_type(mis)
            md.append(
                f"| `{mis['id']}` | `{mis['field']}` | `{mis['table']}` | "
                f"**{mis['expected_action']}** | {mis['predicted_action']} | "
                f"`{mis['tier']}` | **{mis['confidence_score']:.4f}** | {err_type} |"
            )

    md.append("")
    return "\n".join(md)


async def run_pipeline(
    source: str | None = None,
    split: str | None = None,
    data_file: str = "eval/golden_labels.json",
    output_dir: str = "performance"
) -> None:
    """Chạy full pipeline trên dataset JSON và xuất 4 báo cáo tier + 1 báo cáo tổng vào output_dir."""
    sys.stdout.reconfigure(encoding="utf-8")

    with open(data_file, encoding="utf-8") as f:
        data = json.load(f)

    if source:
        data = [row for row in data if row.get("source") == source]
    if split:
        data = [row for row in data if row.get("split") == split]

    scope_parts = []
    if source:
        scope_parts.append(f"source={source}")
    if split:
        scope_parts.append(f"split={split}")
    scope = ", ".join(scope_parts) if scope_parts else "all"

    print(f"🚀 Bắt đầu chạy Performance Pipeline trên {len(data)} test cases (Scope: {scope}, File: {data_file})...")

    results = []
    eval_start = time.time()

    for row in tqdm(data, desc="🔍 Running Pipeline"):
        res = await process_row(row)
        results.append(res)
        if res["tier"] == "TIER_3_LLM" or "FAILED" in res["tier"]:
            await asyncio.sleep(0.05)
        else:
            await asyncio.sleep(0.01)

    eval_end = time.time()
    total_eval_time = eval_end - eval_start

    # Tạo thư mục output_dir nếu chưa có
    perf_dir = Path(output_dir)
    perf_dir.mkdir(parents=True, exist_ok=True)

    # 1. Xuất 4 bản báo cáo độc lập cho 4 Tiers
    print(f"\n📝 Đang tạo 4 bản báo cáo chi tiết cho từng Tier vào {perf_dir}...")
    for cfg in TIER_CONFIGS:
        tier_items = [r for r in results if r["tier"] == cfg["id"]]
        tier_report_content = generate_tier_report(cfg, tier_items, scope)
        tier_file_path = perf_dir / cfg["file"]
        with open(tier_file_path, "w", encoding="utf-8") as f:
            f.write(tier_report_content)
        t_m = compute_metrics(tier_items)
        print(f"  • Đã tạo: {tier_file_path.name:<25} ({len(tier_items):>2} cases | Acc: {t_m['accuracy']:>6.2f}% | Risk: {t_m['risk_cw']*100:>5.2f}%)")

    # 2. Xuất bản báo cáo tổng hợp
    combined_report_content = generate_combined_report(results, total_eval_time, scope)
    combined_path = perf_dir / "performance_report.md"
    with open(combined_path, "w", encoding="utf-8") as f:
        f.write(combined_report_content)
    print(f"  • Đã tạo: {combined_path.name:<25} (Báo cáo tổng hợp đối chiếu)")

    # 3. Xuất file kết quả JSON
    json_path = perf_dir / "performance_results.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print(f"  • Đã tạo: {json_path.name:<25} (Dữ liệu kết quả thô)")

    # In tóm tắt ra console
    m_all = compute_metrics(results)
    print(f"\n{'=' * 65}")
    print(f"📊 PERFORMANCE EVALUATION HOÀN THÀNH TOÀN DIỆN ({output_dir})")
    print(f"{'=' * 65}")
    print(f"  • Tổng test cases:      {len(results)}")
    print(f"  • Action Accuracy:      {m_all['accuracy']:.2f}% ({m_all['correct_action']}/{len(results)})")
    print(f"  • Precision:            {m_all['precision']:.2f}%")
    print(f"  • Recall:               {m_all['recall']:.2f}%")
    print(f"  • F1 Score:             {m_all['f1']:.2f}%")
    print(f"  • F2 Score:             {m_all['f2']:.2f}%")
    print(f"  • Risk (R_CW):          {m_all['risk_cw']:.4f} ({m_all['risk_cw'] * 100:.2f}%)")
    print(f"  • Latency trung bình:   {m_all['avg_latency'] * 1000:.2f} ms")
    print(f"  • Tổng thời gian:       {total_eval_time:.2f} s")
    print(f"{'=' * 65}")
    print(f"📁 Tất cả báo cáo đã được lưu trữ trong thư mục: {output_dir}/")
    for cfg in TIER_CONFIGS:
        print(f"   - {output_dir}/{cfg['file']}")
    print(f"   - {output_dir}/{combined_path.name}")
    print(f"{'=' * 65}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="PIIGuard Performance Multi-Tier Evaluation")
    parser.add_argument("--data-file", default="eval/golden_labels.json", help="Path to evaluation dataset JSON")
    parser.add_argument("--output-dir", default="performance", help="Directory to save reports and results")
    parser.add_argument("--source", help="Filter by source (e.g. postgres, mongo, a_dataset, b_dataset, ab_dataset)")
    parser.add_argument("--split", choices=["dev", "holdout", "train", "test"], help="Filter by split")
    args = parser.parse_args()
    asyncio.run(run_pipeline(args.source, args.split, args.data_file, args.output_dir))
