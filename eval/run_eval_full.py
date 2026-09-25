import asyncio
import json
import os

from tqdm import tqdm

from src.agents.graph import agent
from src.detection.taxonomy import PIIType
from src.models.schemas import ColumnProfile


async def process_row(row):
    # Giả lập Database Connector (connector thực tế sẽ tự biết cột nào là PK/FK nhờ metadata)
    is_key = row.get('expected_action') == 'HMAC'
    system_rec = "HMAC" if is_key else None

    profile = ColumnProfile(
        column_name=row['field_path'],
        data_type=row['data_type'],
        is_primary_key=is_key,
        is_foreign_key=False,
        samples=[row['sample_value']],
        system_recommendation=system_rec
    )

    import time
    max_retries = 3
    start_time = time.time()
    for attempt in range(max_retries):
        try:
            # Gọi toàn bộ luồng Agent
            result_state = await agent.ainvoke({"column_profile": profile})
            final_proposal = result_state.get("final_proposal")

            if final_proposal:
                pred_type = final_proposal.inferred_pii_type
                pred_action = final_proposal.recommended_action
                tier = final_proposal.tier
            else:
                pred_type = PIIType.UNKNOWN.value
                pred_action = "KEEP"
                tier = "ERROR_OR_NO_PROPOSAL"

            break # Thành công, thoát vòng lặp retry

        except Exception as e:
            error_msg = str(e)
            if "429" in error_msg or "502" in error_msg or "resourceexhausted" in error_msg.lower() or "quota" in error_msg.lower():
                if attempt < max_retries - 1:
                    print(f"\n[⚠️] Đụng trần API Google. Tạm nghỉ 15s để hồi phục (Lần {attempt+1}/{max_retries})...")
                    await asyncio.sleep(15)
                    continue

            # Lỗi khác hoặc hết lượt thử
            pred_type = PIIType.UNKNOWN.value
            pred_action = "KEEP"
            tier = f"FAILED: {error_msg}"
            break

    latency = time.time() - start_time
    golden_type = row['taxonomy_id']
    expected_action = row.get('expected_action', 'KEEP')

    # Đánh giá theo 2 tiêu chí
    # Lưu ý: Hệ thống đề xuất HMAC, nhưng trong nhãn có thể là HASHING, cần chuẩn hóa
    pred_action_norm = "HMAC" if pred_action in ["HASHING", "HMAC"] else pred_action
    expected_action_norm = "HMAC" if expected_action in ["HASHING", "HMAC"] else expected_action
    match_action = (expected_action_norm == pred_action_norm)

    return {
        "id": row['id'],
        "field": row['field_path'],
        "golden_type": golden_type,
        "predicted_type": pred_type,
        "expected_action": expected_action_norm,
        "predicted_action": pred_action_norm,
        "tier": tier,
        "match_action": match_action,
        "latency": latency
    }

async def run_eval_full():
    with open('eval/golden_labels.json', encoding='utf-8') as f:
        data = json.load(f)

    print(f"Bắt đầu chạy đánh giá toàn bộ luồng Agent trên {len(data)} test cases...")

    results = []
    # Chạy tuần tự để tránh bị Rate Limit của API
    import time
    eval_start = time.time()
    for row in tqdm(data, desc="Evaluating"):
        res = await process_row(row)
        results.append(res)
        # Smart Sleep: Tránh dồn request gây Rate Limit
        if res['tier'] == "TIER_3_LLM" or "FAILED" in res['tier']:
            await asyncio.sleep(0.1)  # Nghỉ 4s để đảm bảo < 15 RPM
        else:
            await asyncio.sleep(0.1) # Tầng 1, 2 chạy tĩnh nên cực nhanh
            
    eval_end = time.time()
    total_eval_time = eval_end - eval_start
    avg_latency = sum(r['latency'] for r in results) / len(results) if results else 0

    total = len(results)
    correct_action = sum(1 for r in results if r['match_action'])

    # Tính toán các metric nhị phân (Positive: Action != KEEP, Negative: Action == KEEP)
    tp = sum(1 for r in results if r['expected_action'] != "KEEP" and r['predicted_action'] != "KEEP")
    fp = sum(1 for r in results if r['expected_action'] == "KEEP" and r['predicted_action'] != "KEEP")
    sum(1 for r in results if r['expected_action'] == "KEEP" and r['predicted_action'] == "KEEP")
    fn = sum(1 for r in results if r['expected_action'] != "KEEP" and r['predicted_action'] == "KEEP")

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f2 = 5 * precision * recall / (4 * precision + recall) if (4 * precision + recall) > 0 else 0.0

    # Tạo nội dung báo cáo
    report = "# Evaluation Report (Full Pipeline)\n\n"
    report += f"- **Tổng số test cases:** {total}\n"
    report += f"- **Tổng thời gian chạy (chứa sleep):** {total_eval_time:.2f}s\n"
    report += f"- **Độ trễ trung bình/case (chưa tính sleep):** {avg_latency:.4f}s\n"
    report += f"- **Độ chính xác theo Hành động bảo mật (Action Accuracy):** {correct_action/total*100:.2f}%\n"
    report += f"- **Precision (Action):** {precision*100:.2f}%\n"
    report += f"- **Recall (Action):** {recall*100:.2f}%\n"
    report += f"- **F2 Score (Action):** {f2*100:.2f}%\n"

    report += "\n## Thống kê chuyên sâu theo Tầng (Tier)\n\n"

    # Analyze by tier
    tier_names = ["TIER_1", "TIER_2", "TIER_3_HYBRID", "TIER_3_LLM"]
    for t in tier_names:
        t_results = [r for r in results if r['tier'] == t]
        t_total = len(t_results)
        if t_total == 0:
            report += f"### {t}\n- Không có case nào dừng ở tầng này.\n\n"
            continue

        t_correct = sum(1 for r in t_results if r['match_action'])
        t_tp = sum(1 for r in t_results if r['expected_action'] != "KEEP" and r['predicted_action'] != "KEEP")
        t_fp = sum(1 for r in t_results if r['expected_action'] == "KEEP" and r['predicted_action'] != "KEEP")
        sum(1 for r in t_results if r['expected_action'] == "KEEP" and r['predicted_action'] == "KEEP")
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

    # Also capture other unexpected tiers (like FAILED)
    other_tiers = set(r['tier'] for r in results) - set(tier_names)
    for t in other_tiers:
        t_results = [r for r in results if r['tier'] == t]
        report += f"### {t}\n- **Số lượng:** {len(t_results)} cases\n\n"

    report += "## Các ca sai Hành động bảo mật (Action Mismatch)\n\n"
    report += "| ID | Trường dữ liệu (Field) | Action Kỳ vọng | Action AI Đề xuất | Lý do sai | Tầng |\n"
    report += "|---|---|---|---|---|---|\n"
    for r in results:
        if not r['match_action']:
            report += f"| {r['id']} | `{r['field']}` | **{r['expected_action']}** | {r['predicted_action']} | - | {r['tier']} |\n"

    os.makedirs('eval/results', exist_ok=True)
    report_path = 'eval/results/report_full.md'
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write(report)

    print("\nEval finished.")
    print(f"- Action Accuracy: {correct_action/total*100:.2f}%")
    print(f"- Action Precision: {precision*100:.2f}%")
    print(f"- Action Recall: {recall*100:.2f}%")
    print(f"- Action F2 Score: {f2*100:.2f}%")
    print(f"Report saved to {report_path}")

if __name__ == '__main__':
    asyncio.run(run_eval_full())

