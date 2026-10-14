from src.detection.dict_ner import DictionaryNERScanner
from src.detection.ml_ner import MLNERScanner
from src.detection.redactor import TextRedactor
from src.detection.regex_ner import RegexNERScanner


class NERPipelines:
    """
    Luồng Redaction Phễu lọc 3 tầng (Entity-Level Mask-and-Pass).
    Quá trình: Text gốc -> Regex -> Mask -> Dict -> Mask -> ML -> Mask -> Text sạch.
    """
    def __init__(self, dict_configs: dict = None):
        print("Initializing NER Pipeline... (loading models)")
        self.regex_scanner = RegexNERScanner()
        self.dict_scanner = DictionaryNERScanner()
        self.ml_scanner = MLNERScanner()

        # Nạp từ điển mẫu nếu có
        if dict_configs:
            for pii_type, keywords in dict_configs.items():
                self.dict_scanner.load_dictionary(pii_type, keywords)

    def redact_document(self, text: str) -> str:
        """
        Thực hiện toàn bộ luồng pipeline để làm sạch một đoạn văn bản.
        """
        if not text:
            return text

        # TẦNG 1: Regex
        regex_matches = self.regex_scanner.scan_text(text)
        text_t1 = TextRedactor.redact(text, regex_matches)

        # TẦNG 2: Từ điển (Aho-Corasick)
        dict_matches = self.dict_scanner.scan_text(text_t1)
        text_t2 = TextRedactor.redact(text_t1, dict_matches)

        # TẦNG 3: AI / ML NER (PhoBERT)
        ml_matches = self.ml_scanner.scan_text(text_t2)
        final_text = TextRedactor.redact(text_t2, ml_matches)

        return final_text

