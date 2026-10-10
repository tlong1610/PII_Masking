from src.detection.ner_orchestrator import NERPipelines


def test_pipeline():
    # Từ điển giả lập
    my_dict = {
        "LOCATION": ["Nha Trang", "Hà Nội", "Hồ Chí Minh"],
        "ORGANIZATION": ["Vingroup", "VinFast"]
    }

    pipeline = NERPipelines(dict_configs=my_dict)

    # Text tổng hợp chứa đủ các thành phần:
    # 0901234567 (PHONE) -> Regex
    # nguyen.van.a@gmail.com (EMAIL) -> Regex
    # Vingroup (ORG) -> Dict
    # Phạm Nhật Vượng (PERSON) -> ML
    raw_text = "Hôm qua anh Phạm Nhật Vượng có ghé thăm cơ sở của tập đoàn Vingroup tại Nha Trang. Hãy liên hệ qua số 0901234567 hoặc email vuong.pn@vingroup.com để biết thêm."

    print("\n--- ORIGINAL TEXT ---")
    print(raw_text)

    clean_text = pipeline.redact_document(raw_text)

    print("\n--- REDACTED TEXT ---")
    print(clean_text)

    # Assertions
    assert "[PERSON_NAME]" in clean_text
    assert "[ORGANIZATION]" in clean_text
    assert "[LOCATION]" in clean_text
    assert "[PHONE]" in clean_text
    assert "[EMAIL]" in clean_text

    print("\nPipeline test passed!")

if __name__ == "__main__":
    test_pipeline()

