
from src.detection.regex_ner import EntityMatch


class MLNERScanner:
    """
    Tầng 3 cho luồng NER: Mô hình học máy (Machine Learning) dựa trên kiến trúc Transformer.
    Sử dụng PhoBERT/ViElectra (models ~110M params) để nhận diện Tên người (PER),
    Địa điểm (LOC), Tổ chức (ORG) dựa vào ngữ cảnh của câu.
    """
    def __init__(self, model_name: str = "NlpHUST/ner-vietnamese-electra-base"):
        try:
            from transformers import pipeline
        except ImportError:
            raise ImportError("Vui lòng cài đặt transformers và torch: pip install transformers torch")

        # Khởi tạo pipeline Token Classification của HuggingFace
        # Quá trình load model có thể mất vài giây cho lần chạy đầu tiên để tải weights (~400MB)
        # aggregation_strategy="simple" sẽ gộp các sub-words (như "Nguyễn", "Văn", "A") thành 1 thực thể nguyên vẹn
        self.nlp = pipeline("ner", model=model_name, aggregation_strategy="simple")

    def scan_text(self, text: str) -> list[EntityMatch]:
        matches = []
        if not text:
            return matches

        # Pipeline NER sẽ trả về list các dictionary. Ví dụ:
        # [{'entity_group': 'PER', 'score': 0.99, 'word': 'Nguyễn Văn A', 'start': 10, 'end': 22}]
        ner_results = self.nlp(text)

        for entity in ner_results:
            word = entity.get("word", "")
            # Bỏ qua nếu mô hình ML nhận diện nhầm các Tag đã chèn từ Tầng 1 và 2 (ví dụ [ORGANIZATION])
            if any(tag in word for tag in ["PERSON", "LOCATION", "ORGANIZATION", "PHONE", "EMAIL", "CCCD"]):
                continue

            # Chuyển đổi nhãn của PhoBERT sang cấu trúc Taxonomy của hệ thống PII
            entity_group = entity.get("entity_group", "")
            if entity_group in ["PER", "PERSON"]:
                pii_type = "PERSON_NAME"
            elif entity_group in ["LOC", "LOCATION"]:
                pii_type = "LOCATION"
            elif entity_group in ["ORG", "ORGANIZATION"]:
                pii_type = "ORGANIZATION"
            else:
                pii_type = entity_group

            matches.append(EntityMatch(
                start=entity["start"],
                end=entity["end"],
                pii_type=pii_type,
                text=word
            ))

        # Sắp xếp kết quả theo thứ tự xuất hiện
        matches.sort(key=lambda x: x.start)
        return matches

