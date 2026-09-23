from typing import List, Optional
from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=5000, description="Tin nhắn từ user")


class ChatResponse(BaseModel):
    response: str = Field(..., description="Phản hồi từ agent")
    analysis: str = Field(default="", description="Phân tích nội bộ")


# --- Schema cho việc trích xuất Database Profile (PII Detect) ---

class ColumnProfile(BaseModel):
    column_name: str = Field(..., description="Tên cột")
    data_type: str = Field(..., description="Kiểu dữ liệu SQL")
    is_primary_key: bool = Field(..., description="Có phải khóa chính không")
    is_foreign_key: bool = Field(..., description="Có phải khóa ngoại không")
    samples: List[str] = Field(..., description="3-5 dữ liệu mẫu khác NULL")
    system_recommendation: Optional[str] = Field(default=None, description="Gợi ý cứng của hệ thống (ví dụ: HASHING cho KEY)")


class TableRelation(BaseModel):
    from_column: str = Field(..., description="Cột khóa ngoại ở bảng hiện tại")
    to_table: str = Field(..., description="Bảng đích mà khóa ngoại trỏ tới")
    to_column: str = Field(..., description="Cột đích ở bảng đích")


class TableProfile(BaseModel):
    table_name: str = Field(..., description="Tên bảng")
    relations: List[TableRelation] = Field(..., description="Danh sách quan hệ khóa ngoại")
    columns: List[ColumnProfile] = Field(..., description="Profile của các cột trong bảng")


class DatabaseProfile(BaseModel):
    database_name: str = Field(..., description="Tên CSDL")
    tables: List[TableProfile] = Field(..., description="Danh sách cấu trúc các bảng")
