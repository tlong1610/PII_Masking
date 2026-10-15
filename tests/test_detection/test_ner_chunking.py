"""Long free text is scanned in chunks under the transformer's 512-token limit, offsets mapped back."""

import re

import src.detection.ml_ner as ml_ner
from src.detection.ml_ner import MLNERScanner
from src.transform.mask_engine import redact_value


class _FakeTokenizer:
    def tokenize(self, text: str) -> list[str]:
        return text.split()


class _FakeNER:
    """Stands in for the HF pipeline: tags 'Bình' as PER and fails like the real model on long input."""

    tokenizer = _FakeTokenizer()

    def __call__(self, text: str) -> list[dict]:
        if len(self.tokenizer.tokenize(text)) > ml_ner.MAX_CHUNK_TOKENS:
            raise RuntimeError("The size of tensor a must match the size of tensor b")
        return [
            {"entity_group": "PER", "word": "Bình", "start": m.start(), "end": m.end()}
            for m in re.finditer("Bình", text)
        ]


def _scanner() -> MLNERScanner:
    scanner = MLNERScanner.__new__(MLNERScanner)
    scanner.nlp = _FakeNER()
    return scanner


def test_long_text_is_chunked_and_offsets_point_into_full_text(monkeypatch):
    monkeypatch.setattr(ml_ner, "MAX_CHUNK_TOKENS", 20)
    text = " ".join(f"Câu số {i} giao hàng cho anh Bình ở kho." for i in range(30))
    matches = _scanner().scan_text(text)
    assert len(matches) == 30
    assert all(text[m.start:m.end] == "Bình" for m in matches)


def test_single_overlong_sentence_is_cut_between_words(monkeypatch):
    monkeypatch.setattr(ml_ner, "MAX_CHUNK_TOKENS", 10)
    text = " ".join(["chữ"] * 50) + " Bình"
    matches = _scanner().scan_text(text)
    assert [text[m.start:m.end] for m in matches] == ["Bình"]


def test_redact_value_fails_closed_when_ner_errors(monkeypatch):
    def boom(_text: str) -> str:
        raise RuntimeError("model failure")

    monkeypatch.setattr("src.detection.ner_orchestrator.redact_free_text", boom)
    assert redact_value("Gọi 0912345678") == "[REDACTED]"
