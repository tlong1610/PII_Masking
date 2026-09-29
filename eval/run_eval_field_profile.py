import argparse
import asyncio
import json
import os
import sys
import time

from tqdm import tqdm

from src.models.schemas import FieldProfile
from src.services.field_profile_scanner_service import scan_field_profiles


def get_shape(val: str) -> str:
    """Biến đổi dữ liệu mẫu thành dạng shape để sinh thống kê (VD: 123 -> XXX)"""
    res = []
    for c in str(val):
        if c.isdigit():
            res.append('X')
        elif c.isalpha():
            res.append('C')
        else:
            res.append(c)
    return "".join(res)

async def process_case(case):
    sample = str(case.get("sample_value", ""))
    shape = get_shape(sample)

    stats = {
        "min_len": len(sample),
        "max_len": len(sample),
        "pattern": shape
    }

    engine_map = {"postgres": "postgresql", "mongo": "mongodb"}
    engine = engine_map.get(case.get("source"), case.get("source", "unknown"))

    profile = FieldProfile(
        engine=engine,
        table_or_collection=case.get("table", "unknown"),
        path=case.get("field_path", "unknown"),
        data_type=case.get("data_type", "string"),
        null_count=0,
        distinct_count=1,
        statistics=stats,
        samples=[case.get("sample_value")] if case.get("sample_value") else []
    )

    start_time = time.time()
    # Gọi hàm xử lý (truyền list gồm 1 phần tử)
    proposals = await scan_field_profiles([profile])
    latency = time.time() - start_time

    proposal = proposals[0]

    expected = case.get("expected_action", "KEEP")
    expected_norm = "HMAC" if expected in ["HASHING", "HMAC"] else expected
    pred_action = proposal.action.value if proposal.action else "KEEP"
    match_action = (expected_norm == pred_action)

    return {
        "id": case["id"],
        "field": proposal.field_path,
        "expected_action": expected_norm,
        "predicted_action": pred_action,
        "tier": proposal.tier,
        "match_action": match_action,
        "latency": latency,
        "split": case.get("split", "unknown")
    }

async def run_eval(mode: str):
    with open("eval/benchmark_data.json", encoding="utf-8") as f:
        cases = json.load(f)

    import src.config
    settings = src.config.get_settings()
    settings.enable_ai_scan = (mode == "full")

    sys.stdout.reconfigure(encoding='utf-8')
    print(f"Bat dau chay danh gia FieldProfile Scanner (Mode: {mode}) tren {len(cases)} cases...")

    results = []
    eval_start = time.time()
    for case in tqdm(cases, desc="Evaluating"):
        res = await process_case(case)
        results.append(res)
        # Nghỉ nhẹ nếu có gọi AI để tránh rate limit
        if settings.enable_ai_scan and res['tier'] == "TIER_3_LLM":
            await asyncio.sleep(0.1)

    total_eval_time = time.time() - eval_start

    total = len(results)
    correct_action = sum(1 for r in results if r['match_action'])
    avg_latency = sum(r['latency'] for r in results) / total if total else 0

    # Tính toán các metric nhị phân (Positive: Action != KEEP, Negative: Action == KEEP)
    tp = sum(1 for r in results if r['expected_action'] != "KEEP" and r['predicted_action'] != "KEEP")
    fp = sum(1 for r in results if r['expected_action'] == "KEEP" and r['predicted_action'] != "KEEP")
    sum(1 for r in results if r['expected_action'] == "KEEP" and r['predicted_action'] == "KEEP")
    fn = sum(1 for r in results if r['expected_action'] != "KEEP" and r['predicted_action'] == "KEEP")

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f2 = 5 * precision * recall / (4 * precision + recall) if (4 * precision + recall) > 0 else 0.0

    dev_count = sum(1 for r in results if r["split"] == "dev")
    holdout_count = sum(1 for r in results if r["split"] == "holdout")

    report = "# Evaluation Report - FieldProfile Scanner (Gate 2)\n\n"
    report += f"- **Mode:** `{mode}` (AI Scan: {settings.enable_ai_scan})\n"
    report += f"- **Tổng số test cases:** {total}\n"
    report += f"- **Dev cases:** {dev_count}\n"
    report += f"- **Holdout cases:** {holdout_count}\n"
    report += f"- **Tổng thời gian chạy (chứa sleep):** {total_eval_time:.2f}s\n"
    report += f"- **Độ trễ trung bình/case (chưa tính sleep):** {avg_latency:.4f}s\n"
    report += f"- **Độ chính xác theo Hành động bảo mật (Action Accuracy):** {correct_action/total*100:.2f}%\n"
    report += f"- **Precision (Action):** {precision*100:.2f}%\n"
    report += f"- **Recall (Action):** {recall*100:.2f}%\n"
    report += f"- **F2 Score (Action):** {f2*100:.2f}%\n\n"

    report += "## Thống kê chuyên sâu theo Tầng (Tier)\n\n"

    tier_names = list(set(r['tier'] for r in results))
    tier_names.sort()

    for t in tier_names:
        t_results = [r for r in results if r['tier'] == t]
        t_total = len(t_results)
        if t_total == 0:
            continue

        t_correct = sum(1 for r in t_results if r['match_action'])
        t_tp = sum(1 for r in t_results if r['expected_action'] != "KEEP" and r['predicted_action'] != "KEEP")
        t_fp = sum(1 for r in t_results if r['expected_action'] == "KEEP" and r['predicted_action'] != "KEEP")
        t_fn = sum(1 for r in t_results if r['expected_action'] != "KEEP" and r['predicted_action'] == "KEEP")

        t_avg_latency = sum(r['latency'] for r in t_results) / t_total
        t_prec = t_tp / (t_tp + t_fp) if (t_tp + t_fp) > 0 else 0.0
        t_rec = t_tp / (t_tp + t_fn) if (t_tp + t_fn) > 0 else 0.0

        report += f"### {t}\n"
        report += f"- **Số lượng:** {t_total} cases\n"
        report += f"- **Latency trung bình:** {t_avg_latency:.4f}s\n"
        report += f"- **Action Accuracy:** {t_correct/t_total*100:.2f}%\n"
        report += f"- **Precision:** {t_prec*100:.2f}%\n"
        report += f"- **Recall:** {t_rec*100:.2f}%\n\n"

    report += "## Các ca sai Hành động bảo mật (Action Mismatch)\n\n"
    report += "| ID | Trường dữ liệu (Field) | Action Kỳ vọng | Action AI Đề xuất | Lý do sai | Tầng |\n"
    report += "|---|---|---|---|---|---|\n"

    for r in results:
        if not r['match_action']:
            report += f"| {r['id']} | `{r['field']}` | **{r['expected_action']}** | {r['predicted_action']} | - | {r['tier']} |\n"

    os.makedirs("eval/results", exist_ok=True)
    report_path = f"eval/results/report_field_profile_{mode}.md"
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(report)

    print(f"Hoan thanh! Da luu bao cao tai {report_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["rules", "full"], default="full")
    args = parser.parse_args()
    asyncio.run(run_eval(args.mode))
