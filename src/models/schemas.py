from enum import StrEnum

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=5000, description="Tin nhắn từ user")


class ChatResponse(BaseModel):
    response: str = Field(..., description="Phản hồi từ agent")
    analysis: str = Field(default="", description="Phân tích nội bộ")


# --- Session / role (server-assigned; client must not choose role) ---


class UserRole(StrEnum):
    DPO = "DPO"
    ANALYST = "ANALYST"


class SessionCreate(BaseModel):
    username: str = Field(..., min_length=1, max_length=64)
    password: str = Field(..., min_length=1, max_length=128)


class SessionResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str
    role: UserRole


# --- Configured demo sources (no credentials in API responses) ---


class SourceType(StrEnum):
    """Family of datastore — not a specific vendor."""

    SQL = "SQL"
    NOSQL = "NOSQL"


class Source(BaseModel):
    id: str = Field(..., description="Stable source id for creating runs")
    name: str = Field(..., description="Display name of the demo source")
    source_type: SourceType = Field(..., description="SQL or NOSQL family")
    engine: str = Field(
        ...,
        description="Concrete engine/dialect for connectors (e.g. postgresql, mysql, mongodb)",
    )
    description: str = ""
    scope_summary: str = Field(
        default="",
        description="High-level scope (tables/collections), never connection secrets",
    )
    status: str = Field(default="ready", description="Connection/config status label")


# --- Runs / field review / build ---


class RunStatus(StrEnum):
    NEW = "NEW"
    SCANNING = "SCANNING"
    REVIEW_REQUIRED = "REVIEW_REQUIRED"
    READY_TO_BUILD = "READY_TO_BUILD"
    BUILDING = "BUILDING"
    VERIFIED = "VERIFIED"
    PUBLISHED = "PUBLISHED"
    FAILED = "FAILED"
    STALE = "STALE"
    REVOKED = "REVOKED"


class PolicyAction(StrEnum):
    MASK = "MASK"
    HMAC = "HMAC"
    DROP = "DROP"
    KEEP = "KEEP"


class DetectorSource(StrEnum):
    RULE = "rule"
    AI = "ai"
    DPO = "dpo"
    UNKNOWN = "unknown"


class DatasetStatus(StrEnum):
    STAGING = "STAGING"
    VERIFIED = "VERIFIED"
    PUBLISHED = "PUBLISHED"
    REVOKED = "REVOKED"
    FAILED = "FAILED"


class RunCreate(BaseModel):
    source_id: str = Field(..., min_length=1, max_length=64)


class FieldProfileOut(BaseModel):
    id: int
    source_path: str
    field_path: str
    data_type: str
    profile_summary: str
    classification: str
    taxonomy_id: str | None = None
    detector_source: DetectorSource
    coverage_status: str
    recommended_action: PolicyAction

    model_config = {"from_attributes": True}


class FieldDecisionOut(BaseModel):
    id: int
    field_profile_id: int
    action: PolicyAction
    reason: str
    decided_by: int
    decision_version: int

    model_config = {"from_attributes": True}


class FieldDecisionItem(BaseModel):
    field_profile_id: int
    action: PolicyAction
    reason: str = ""


class FieldDecisionsUpdate(BaseModel):
    decisions: list[FieldDecisionItem] = Field(..., min_length=1)


class DatasetOut(BaseModel):
    id: int
    run_id: int
    dataset_name: str
    status: DatasetStatus
    output_location: str

    model_config = {"from_attributes": True}


class RunOut(BaseModel):
    id: int
    source_id: str
    source_type: SourceType
    source_name: str
    engine: str
    status: RunStatus
    created_by: int
    source_manifest_version: str
    policy_version: str
    field_profiles: list[FieldProfileOut] = Field(default_factory=list)
    field_decisions: list[FieldDecisionOut] = Field(default_factory=list)
    datasets: list[DatasetOut] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class BuildResponse(BaseModel):
    run: RunOut
    dataset: DatasetOut


# --- Schema cho việc trích xuất Database Profile (PII Detect) ---

class ColumnProfile(BaseModel):
    column_name: str = Field(..., description="Tên cột")
    data_type: str = Field(..., description="Kiểu dữ liệu SQL")
    is_primary_key: bool = Field(..., description="Có phải khóa chính không")
    is_foreign_key: bool = Field(..., description="Có phải khóa ngoại không")
    samples: list[str] = Field(..., description="3-5 dữ liệu mẫu khác NULL")
    system_recommendation: str | None = Field(
        default=None, description="Gợi ý cứng của hệ thống (ví dụ: HASHING cho KEY)"
    )


class TableRelation(BaseModel):
    from_column: str = Field(..., description="Cột khóa ngoại ở bảng hiện tại")
    to_table: str = Field(..., description="Bảng đích mà khóa ngoại trỏ tới")
    to_column: str = Field(..., description="Cột đích ở bảng đích")


class TableProfile(BaseModel):
    table_name: str = Field(..., description="Tên bảng")
    relations: list[TableRelation] = Field(..., description="Danh sách quan hệ khóa ngoại")
    columns: list[ColumnProfile] = Field(..., description="Profile của các cột trong bảng")


class DatabaseProfile(BaseModel):
    database_name: str = Field(..., description="Tên CSDL")
    tables: list[TableProfile] = Field(..., description="Danh sách cấu trúc các bảng")


# --- Schema cho kết quả quét PII (Output của Scanner / LLM) ---

class FieldScanResult(BaseModel):
    field_name: str = Field(..., description="Tên cột đã phân tích")
    inferred_pii_type: str = Field(
        ..., description="Loại PII phát hiện (Ví dụ: CCCD, PHONE, EMAIL, UNKNOWN)"
    )
    confidence: float = Field(..., description="Độ tin cậy (0.0 đến 1.0)")
    recommended_action: str = Field(..., description="Hành động gợi ý: MASK, DROP, HMAC, KEEP")
    reasoning: str = Field(..., description="Lý do hoặc căn cứ quyết định")

    # Các trường mở rộng cho mô hình Phễu lọc 3 tầng
    tier: str = Field(default="", description="Tầng ra quyết định (TIER_1, TIER_2, TIER_3)")
    bm25_score: float | None = Field(default=None, description="Điểm tần suất từ khóa BM25 (Tầng 2)")
    hybrid_score: float | None = Field(default=None, description="Điểm hỗn hợp Hybrid (Tầng 3.1)")
