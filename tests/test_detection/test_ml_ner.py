from src.detection.ml_ner import MLNERScanner


def test_ml_ner_scanner():
    print("Loading ML Model (this might take a few seconds on first run)...")
    scanner = MLNERScanner()

    # Text đã bị loại bỏ SĐT/Email từ Tầng 1 và Tầng 2, chỉ còn văn bản thuần.
    text = "Hôm qua anh Phạm Nhật Vượng có ghé thăm cơ sở của tập đoàn Vingroup tại Nha Trang."

    print(f"Scanning text: '{text}'")
    matches = scanner.scan_text(text)

    print(f"Found {len(matches)} matches:")
    for m in matches:
        print(f"- {m.pii_type}: '{m.text}' at [{m.start}:{m.end}]")

    assert len(matches) == 3

    # Sort matches to assert in order
    matches_sorted = sorted(matches, key=lambda x: x.start)

    assert matches_sorted[0].pii_type == "PERSON_NAME"
    assert "Phạm Nhật Vượng" in matches_sorted[0].text

    assert matches_sorted[1].pii_type == "ORGANIZATION"
    assert "Vingroup" in matches_sorted[1].text

    assert matches_sorted[2].pii_type == "LOCATION"
    assert "Nha Trang" in matches_sorted[2].text

    print("All ML NER tests passed!")

if __name__ == "__main__":
    test_ml_ner_scanner()

