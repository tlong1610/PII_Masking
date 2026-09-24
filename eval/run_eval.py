import json
import os

from src.detection.rule_engine import RuleBasedScanner
from src.detection.taxonomy import PIIType
from src.models.schemas import ColumnProfile


def run_eval():
    with open('eval/golden_labels.json', encoding='utf-8') as f:
        data = json.load(f)

    # Khởi tạo Rule Engine
    scanner = RuleBasedScanner(match_threshold=1.0)

    # Ánh xạ từ taxonomy của golden label sang PIIType của Rule Engine.
    # Vì Rule Engine chỉ bắt các rule cơ bản, những trường phức tạp sẽ
    # được kỳ vọng trả về UNKNOWN để pass sang LangGraph.
    label_map = {
        "CCCD": PIIType.CCCD.value,
        "EMAIL": PIIType.EMAIL.value,
        "PHONE_VN": PIIType.PHONE.value,
        "PHONE_FAX": PIIType.UNKNOWN.value,  # Chưa có regex cho fax, mong đợi UNKNOWN
        "TAX_CODE_PERSONAL": PIIType.TAX_CODE.value,
        "TAX_CODE_ORG": PIIType.TAX_CODE.value,
        "TRACKING_NUMBER": PIIType.TRACKING_CODE.value,
        "TRANSACTION_ID": PIIType.TRACKING_CODE.value,
        "FINANCIAL_AMOUNT": PIIType.MONEY_ALONE.value
    }

    results = []
    supported_classes_count = 0
    supported_classes_correct = 0

    for row in data:
        profile = ColumnProfile(
            column_name=row['field_path'],
            data_type=row['data_type'],
            is_primary_key="_id" in row['field_path'] or "id" == row['field_path'].lower(),
            is_foreign_key=False,
            samples=[row['sample_value']],
            system_recommendation=None
        )

        scan_res = scanner.tier1_static_filter(profile)
        pred = scan_res.inferred_pii_type if scan_res else PIIType.UNKNOWN.value

        golden = row['taxonomy_id']
        expected = label_map.get(golden, PIIType.UNKNOWN.value)

        match = (expected == pred)

        # Chỉ tính metric precision/recall cho những class mà rule engine hỗ trợ hoặc là ca âm
        if expected != PIIType.UNKNOWN.value:
            supported_classes_count += 1
            if match:
                supported_classes_correct += 1

        results.append({
            "id": row['id'],
            "field": row['field_path'],
            "golden": golden,
            "expected": expected,
            "predicted": pred,
            "match": match
        })

    total = len(results)
    correct = sum(1 for r in results if r['match'])

    # Tính toán các metric nhị phân (Positive: PII, Negative: UNKNOWN hoặc Không phải PII)
    negative_classes = [PIIType.UNKNOWN.value, PIIType.TRACKING_CODE.value, PIIType.MONEY_ALONE.value]
    tp = sum(1 for r in results if r['expected'] not in negative_classes and r['predicted'] not in negative_classes)
    fp = sum(1 for r in results if r['expected'] in negative_classes and r['predicted'] not in negative_classes)
    tn = sum(1 for r in results if r['expected'] in negative_classes and r['predicted'] in negative_classes)
    fn = sum(1 for r in results if r['expected'] not in negative_classes and r['predicted'] in negative_classes)

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f2 = 5 * precision * recall / (4 * precision + recall) if (4 * precision + recall) > 0 else 0.0

    # Tạo nội dung báo cáo
    report = "# Evaluation Report (Rule-Based Only)\n\n"
    report += f"- **Tổng số test cases:** {total}\n"
    report += f"- **Độ chính xác tổng thể (Overall Accuracy):** {correct/total*100:.2f}%\n"
    if supported_classes_count > 0:
        report += f"- **Độ chính xác trên các nhãn quy tắc hỗ trợ:** {supported_classes_correct/supported_classes_count*100:.2f}% ({supported_classes_correct}/{supported_classes_count})\n"
    report += f"- **Precision (PII Detection):** {precision*100:.2f}%\n"
    report += f"- **Recall (PII Detection):** {recall*100:.2f}%\n"
    report += f"- **F2 Score (PII Detection):** {f2*100:.2f}%\n"
    report += "\n## Các ca dự đoán SAI (Failed Cases)\n\n"

    report += "| ID | Trường dữ liệu (Field) | Golden Label | Kỳ vọng Rule Engine | Thực tế Rule Engine |\n"
    report += "|---|---|---|---|---|\n"
    for r in results:
        if not r['match']:
            report += f"| {r['id']} | `{r['field']}` | {r['golden']} | **{r['expected']}** | {r['predicted']} |\n"

    os.makedirs('eval/results', exist_ok=True)
    report_path = 'eval/results/report.md'
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write(report)

    print(f"Eval finished. Overall Accuracy: {correct/total*100:.2f}%.")
    print(f"Precision: {precision*100:.2f}%")
    print(f"Recall: {recall*100:.2f}%")
    print(f"F2 Score: {f2*100:.2f}%")
    print(f"Report saved to {report_path}")


if __name__ == '__main__':
    run_eval()

