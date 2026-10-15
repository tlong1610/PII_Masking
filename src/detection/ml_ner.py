
import re

from src.detection.regex_ner import EntityMatch

# The model takes at most 512 tokens (incl. special tokens); longer text is scanned in chunks below this.
MAX_CHUNK_TOKENS = 400
_SENTENCE = re.compile(r"[^.!?\n]+[.!?\n]*\s*|[.!?\n]+\s*")
_WORD = re.compile(r"\S+\s*|\s+")


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
        # Long text is split into chunks the model accepts; offsets are shifted back to the full text.
        ner_results = []
        for offset, chunk in self._chunks(text):
            for entity in self.nlp(chunk):
                ner_results.append({**entity, "start": entity["start"] + offset, "end": entity["end"] + offset})

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

    def _token_count(self, text: str) -> int:
        return len(self.nlp.tokenizer.tokenize(text))

    def _chunks(self, text: str) -> list[tuple[int, str]]:
        """(offset, chunk) pieces of text, each under MAX_CHUNK_TOKENS, cut at sentence ends.

        A sentence that is itself too long is cut between words, so an entity is only split when one
        sentence alone exceeds the model limit.
        """
        if self._token_count(text) <= MAX_CHUNK_TOKENS:
            return [(0, text)]
        units: list[tuple[int, int]] = []
        for sentence in _SENTENCE.finditer(text):
            if self._token_count(sentence.group()) <= MAX_CHUNK_TOKENS:
                units.append(sentence.span())
            else:
                units.extend((sentence.start() + w.start(), sentence.start() + w.end())
                             for w in _WORD.finditer(sentence.group()))
        chunks: list[tuple[int, str]] = []
        start = end = units[0][0]
        for unit_start, unit_end in units:
            if end > start and self._token_count(text[start:unit_end]) > MAX_CHUNK_TOKENS:
                chunks.append((start, text[start:end]))
                start = unit_start
            end = unit_end
        chunks.append((start, text[start:end]))
        return chunks
