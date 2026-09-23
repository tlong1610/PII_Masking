import json
import os
from pathlib import Path
from typing import List

try:
    from langchain_core.documents import Document
    from langchain_chroma import Chroma
    from langchain_huggingface import HuggingFaceEmbeddings
except ImportError:
    raise ImportError("Vui lòng cài đặt thư viện: pip install langchain-chroma chromadb langchain-huggingface sentence-transformers")


class PIIKnowledgeBase:
    """
    Quản lý Vector Database (ChromaDB) cho hệ thống PII RAG.
    Nạp dữ liệu từ file JSON (đã phân chia ngữ nghĩa) và cung cấp Retriever cho LLM.
    """

    def __init__(self, db_directory: str = "data/chroma_db"):
        self.db_directory = db_directory
        # Sử dụng mô hình Local chạy thẳng trên máy (Không tốn phí, không lộ dữ liệu)
        # Có thể đổi thành "keepitreal/vietnamese-sbert" nếu cần tiếng Việt chuyên sâu
        self.embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
        self.vector_store = None

    def initialize_db(self, corpus_path: str = "src/detection/pii_rag_corpus.json"):
        """
        Bước 1: Đọc file JSON (đã chunking sẵn) và nạp vào ChromaDB.
        Lưu ý: Do dữ liệu trong file JSON đã được phân chia cực kỳ sạch sẽ (1 chunk = 1 entity/rule),
        chúng ta không cần dùng tới TextSplitter.
        """
        if not os.path.exists(corpus_path):
            raise FileNotFoundError(f"Không tìm thấy file corpus tại {corpus_path}")

        with open(corpus_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        documents: List[Document] = []
        for item in data:
            content = item.get("content", "")
            meta = item.get("metadata", {})
            
            # Lưu ý quan trọng: ChromaDB chỉ chấp nhận metadata là string, int, float, bool.
            # Không chấp nhận kiểu mảng (List), nên ta phải biến đổi mảng keywords thành string.
            if "keywords" in meta and isinstance(meta["keywords"], list):
                meta["keywords"] = ", ".join(meta["keywords"])
                
            # Đẩy thêm ID vào metadata để dễ truy vết
            meta["entity_id"] = item.get("id", "")
            
            doc = Document(page_content=content, metadata=meta)
            documents.append(doc)
            
        print(f"Đang nhúng (embed) {len(documents)} chunks ngữ nghĩa vào ChromaDB...")
        
        # Tạo mới và lưu trực tiếp xuống ổ cứng (persist_directory)
        self.vector_store = Chroma.from_documents(
            documents=documents,
            embedding=self.embeddings,
            persist_directory=self.db_directory
        )
        print(f"✅ Đã tạo VectorDB thành công tại: {self.db_directory}")

    def get_retriever(self, top_k: int = 3):
        """
        Bước 2: Lấy công cụ tìm kiếm (Retriever) để cắm vào LLM Chain / LangGraph
        """
        if not self.vector_store:
            # Load lại DB từ ổ cứng (dùng cho các lần chạy sau)
            self.vector_store = Chroma(
                persist_directory=self.db_directory,
                embedding_function=self.embeddings
            )
            
        # Trả về retriever, cấu hình lấy top 3 chunks giống ngữ nghĩa nhất
        return self.vector_store.as_retriever(search_kwargs={"k": top_k})


if __name__ == "__main__":
    # Script khởi tạo ChromaDB từ file JSON (Chạy 1 lần duy nhất lúc setup)
    print("Bắt đầu khởi tạo Knowledge Base (VectorDB)...")
    kb = PIIKnowledgeBase()
    kb.initialize_db()

