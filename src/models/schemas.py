try:
    from enum import StrEnum
except ImportError:
    from enum import Enum

    class StrEnum(str, Enum):  # noqa: UP042
        pass

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


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


class SourceCreate(BaseModel):
    """Register a customer database by connection URL (write-only; never echoed back)."""

    name: str = Field(..., min_length=1, max_length=128)
    url: str = Field(..., min_length=8, max_length=2048, repr=False)
    namespace: str = Field(
        default="",
        max_length=128,
        description="Postgres schema (default public) or Mongo database (default: from URL path)",
    )
    tables: list[str] = Field(default_factory=list, description="Optional table/collection allowlist")


class SourceTestResult(BaseModel):
    ok: bool
    engine: str = ""
    message: str = ""
    namespaces: list[str] = Field(
        default_factory=list, description="Schemas (Postgres) or databases (Mongo) to pick from; names only"
    )
    default_namespace: str = Field(default="", description="Namespace used when the DPO picks none")


class SourceScopeField(BaseModel):
    name: str = Field(..., description="Safe field/column name; no sample/raw value")
    data_type: str = ""
    is_primary_key: bool = False
    is_foreign_key: bool = False


class SourceScopeItem(BaseModel):
    name: str = Field(..., description="Table or collection name")
    kind: str = Field(..., description="table or collection")
    field_count: int = 0
    fields: list[SourceScopeField] = Field(default_factory=list)
    row_count: int | None = None
    document_count: int | None = None


class ScopeRelationship(BaseModel):
    """Join between two tables/collections (declared FK, logical key or inferred Mongo reference)."""

    source_table: str
    source_column: str
    target_table: str
    target_column: str


class SourceScope(BaseModel):
    source_id: str
    source_type: SourceType
    engine: str
    items: list[SourceScopeItem]
    relationships: list[ScopeRelationship] = Field(default_factory=list)


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
    CANCELLED = "CANCELLED"


class PolicyAction(StrEnum):
    MASK = "MASK"
    HMAC = "HMAC"
    DROP = "DROP"
    KEEP = "KEEP"
    TOKENIZE = "TOKENIZE"
    PARTIAL = "PARTIAL"
    GENERALIZE = "GENERALIZE"
    REDACT = "REDACT"
    NULLIFY = "NULLIFY"



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


class VerifierCheckStatus(StrEnum):
    PASSED = "PASSED"
    FAILED = "FAILED"


class RunCreate(BaseModel):
    source_id: str = Field(..., min_length=1, max_length=64)
    selected_scope: list[str] = Field(
        default_factory=list,
        description="Selected table/collection names to scan",
    )
    link_scope: list[str] = Field(
        default_factory=list,
        description="Link-only tables (missing parent/bridge tables): join keys default to HMAC, other fields DROP",
    )


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
    confidence_score: float | None = None

    model_config = {"from_attributes": True}


class FieldDecisionOut(BaseModel):
    id: int
    field_profile_id: int
    action: PolicyAction
    reason: str
    decided_by: int
    decision_version: int
    is_exception: bool = False
    exception_until: datetime | None = None

    model_config = {"from_attributes": True}


class FieldDecisionHistoryOut(BaseModel):
    id: int
    run_id: int
    field_profile_id: int
    from_action: PolicyAction | None = None
    to_action: PolicyAction
    from_reason: str | None = None
    to_reason: str = ""
    version: int
    decided_by: int
    created_at: datetime
    is_exception: bool = False
    exception_until: datetime | None = None

    model_config = {"from_attributes": True}


class FieldDecisionItem(BaseModel):
    field_profile_id: int
    action: PolicyAction
    reason: str = ""
    is_exception: bool = False
    exception_until: datetime | None = None
    classification_override: Literal["NON_PERSONAL"] | None = Field(
        default=None,
        description="DPO confirms an UNKNOWN field is not personal data (reason required)",
    )


class JoinKeyOut(BaseModel):
    """A join between two scanned fields; both ends must use the same KEEP/HMAC action."""

    from_table: str
    from_column: str
    to_table: str
    to_column: str


class FieldDecisionsUpdate(BaseModel):
    decisions: list[FieldDecisionItem] = Field(..., min_length=1)


class DatasetOut(BaseModel):
    id: int
    run_id: int
    dataset_name: str
    status: DatasetStatus
    output_location: str
    created_at: datetime | None = None
    published_at: datetime | None = None
    revoked_at: datetime | None = None
    source_id: str | None = None
    source_name: str | None = None
    engine: str | None = None
    grant_count: int | None = None

    model_config = {"from_attributes": True}


class DatasetPreviewColumn(BaseModel):
    name: str
    source_path: str = Field(default="", description="Source table/collection for grouping")
    data_type: str
    transform: str = Field(description="MASK | HMAC | KEEP | DROPPED marker")


class DatasetRelationship(BaseModel):
    source_table: str
    source_column: str
    target_table: str
    target_column: str


class DatasetVerification(BaseModel):
    """Outcome of the downstream verifier for a dataset: counts only, safe to show an Analyst."""

    passed: int
    total: int


class DatasetPreview(BaseModel):
    dataset_id: int
    dataset_name: str
    status: DatasetStatus
    columns: list[DatasetPreviewColumn]
    rows: list[dict]
    tables: list[str] = Field(default_factory=list, description="Snapshot tables/collections in this dataset")
    selected_table: str = Field(default="", description="Table/collection the rows belong to")
    note: str = "Processed output only; raw source values are never included"
    relationships: list[DatasetRelationship] = Field(default_factory=list)
    verification: DatasetVerification | None = None


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
    decision_history: list[FieldDecisionHistoryOut] = Field(default_factory=list)
    datasets: list[DatasetOut] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class VerifierResultOut(BaseModel):
    id: int
    dataset_id: int
    check_name: str
    status: VerifierCheckStatus
    baseline_value: str
    actual_value: str
    tolerance: str
    details: str

    model_config = {"from_attributes": True}


class RunSummaryOut(BaseModel):
    """Lightweight run row for the DPO run history list (no field profiles, no values)."""

    id: int
    source_id: str
    source_type: SourceType
    source_name: str
    engine: str
    status: RunStatus
    created_by: int
    created_by_username: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    field_count: int = 0
    pii_field_count: int = 0
    decided_count: int = 0
    latest_dataset_id: int | None = None
    latest_dataset_status: DatasetStatus | None = None


class DatasetDetailOut(DatasetOut):
    """Dataset plus verifier checks and per-action column counts (metadata only)."""

    run_status: RunStatus | None = None
    verifier_results: list[VerifierResultOut] = Field(default_factory=list)
    action_counts: dict[str, int] = Field(default_factory=dict)


class UserOut(BaseModel):
    id: int
    username: str
    role: UserRole


DATASET_NAME_MAX = 120


def _clean_dataset_name(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = " ".join(value.split())
    return cleaned or None


class BuildRequest(BaseModel):
    """Optional body of POST /runs/{id}/build: the name the Analyst sees (kept on rebuild when omitted)."""

    dataset_name: str | None = Field(default=None, max_length=DATASET_NAME_MAX)

    _clean = field_validator("dataset_name", mode="before")(_clean_dataset_name)


class DatasetRename(BaseModel):
    dataset_name: str = Field(..., min_length=1, max_length=DATASET_NAME_MAX)

    _clean = field_validator("dataset_name", mode="before")(_clean_dataset_name)


class BuildResponse(BaseModel):
    run: RunOut
    dataset: DatasetOut
    verifier_results: list[VerifierResultOut] = Field(default_factory=list)


# --- Schema cho việc trích xuất Database Profile (PII Detect) ---

class ColumnProfile(BaseModel):
    table_name: str | None = Field(default=None, description="Tên bảng hoặc collection")
    column_name: str = Field(..., description="Tên cột")
    data_type: str = Field(..., description="Kiểu dữ liệu SQL")
    is_primary_key: bool = Field(..., description="Có phải khóa chính không")
    is_foreign_key: bool = Field(..., description="Có phải khóa ngoại không")
    samples: list[str] = Field(
        ...,
        description="Dữ liệu mẫu ngắn hạn chỉ xử lý trong bộ nhớ (In-memory ephemeral samples)",
    )
    system_recommendation: str | None = Field(
        default=None, description="Gợi ý cứng của hệ thống (ví dụ: HASHING cho KEY)"
    )
    length_mean: float | None = Field(default=None, description="Trung bình chiều dài dữ liệu cột")
    length_variance: float | None = Field(default=None, description="Phương sai chiều dài dữ liệu cột")
    # Distribution stats computed inside the source DB (counts only, never values). In-memory only.
    profiled_values: int | None = Field(default=None, description="Số giá trị khác NULL đã thống kê")
    distinct_ratio: float | None = Field(default=None, description="Số giá trị khác nhau / số giá trị khác NULL")
    null_ratio: float | None = Field(default=None, description="Tỷ lệ NULL trên số dòng đã thống kê")


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
    confidence_score: float | None = Field(default=None, description="Điểm tin cậy của tier (BM25 normalized, hybrid fusion, hoặc LLM softmax)")
    provider_meta: dict | None = Field(default=None, description="LLM provider metadata (usage/model), no data")

# --- Schema cho Luồng Enterprise (Gate 2 - Không chứa raw PII) ---

class FieldProfile(BaseModel):
    """Profile của một trường đã được lọc — không chứa raw sample_value."""
    engine: str = Field(..., description='"postgresql" hoặc "mongodb"')
    table_or_collection: str = Field(..., description="Tên bảng hoặc collection")
    path: str = Field(..., description="Đường dẫn trường (VD: 'cccd' hoặc 'identity.cccd')")
    data_type: str = Field(..., description="Kiểu dữ liệu (VD: 'string', 'integer')")
    null_count: int = Field(default=0, description="Số lượng giá trị null")
    distinct_count: int = Field(default=0, description="Số lượng giá trị unique")
    statistics: dict = Field(
        default_factory=dict,
        description="Thống kê đã làm sạch (VD: {'min_len': 12, 'max_len': 12, 'pattern': 'XXX'})"
    )
    samples: list[str] = Field(
        default_factory=list,
        description="Dữ liệu mẫu đã che/khử nhận dạng (Masked/Sanitized samples - KHÔNG chứa raw PII)",
    )

class FieldScanProposal(BaseModel):
    """Kết quả scan trả về cho luồng Enterprise."""
    field_path: str = Field(..., description="Đường dẫn trường (khớp với input)")
    classification: str = Field(..., description="Phân loại (VD: PERSONAL_SENSITIVE, NON_PERSONAL)")
    action: PolicyAction = Field(..., description="Hành động đề xuất (MASK, HMAC, KEEP, DROP)")
    reason: str = Field(..., description="Lý do đề xuất")
    confidence: float = Field(..., description="Độ tự tin (0.0 - 1.0)")
    tier: str = Field(..., description="Tầng ra quyết định (VD: TIER_1_RULES, TIER_3_LLM)")
    provider_meta: dict | None = Field(default=None, description="Metadata bổ sung từ LLM/Scanner")


# --- Schema cho Audit Log Hash-Chain (FR-11, §14.3) ---

class AuditEventOut(BaseModel):
    id: int
    actor_id: int
    role: str
    action: str
    entity_type: str
    entity_id: str
    reason: str
    created_at: datetime
    prev_hash: str
    entry_hash: str
    request_id: str | None = None
    client_ip: str | None = None
    actor_username: str | None = None
    # Display context: the run the event belongs to (also for dataset events) and its source's name.
    run_id: int | None = None
    source_name: str | None = None

    model_config = {"from_attributes": True}



class AuditVerifyResponse(BaseModel):
    valid: bool
    total_events: int
    head_hash: str | None = None
    broken_at_id: int | None = None
    error: str | None = None


# --- Vault Detokenization (§9.5, FR-13) ---

class DetokenizeRequest(BaseModel):
    token: str = Field(..., min_length=1, max_length=128, description="Token cần giải mã")
    reason: str = Field(..., min_length=5, max_length=1000, description="Lý do giải mã bắt buộc (phục vụ thanh tra / nghiệp vụ)")


class DetokenizeResponse(BaseModel):
    token: str = Field(..., description="Token đã giải mã")
    raw_value: str = Field(..., description="Giá trị gốc được giải mã")
    entity_type: str = Field(..., description="Loại thực thể PII")
    key_version: str = Field(..., description="Phiên bản khóa mã hóa")
    decrypted_at: datetime = Field(..., description="Thời điểm giải mã")


# --- Health Check Probes (§17.1) ---

class HealthzResponse(BaseModel):
    status: str = Field(default="ok", description="Trạng thái tiến trình FastAPI")
    timestamp: str = Field(..., description="Thời gian hiện tại ISO 8601")
    version: str = Field(default="1.0.0", description="Phiên bản ứng dụng")


class ReadyzResponse(BaseModel):
    status: str = Field(..., description="'ready' nếu các dịch vụ sẵn sàng, ngược lại 'not_ready'")
    checks: dict[str, str] = Field(..., description="Chi tiết ping kiểm tra CSDL, MongoDB, LLM")
    timestamp: str = Field(..., description="Thời gian hiện tại ISO 8601")


# --- Dataset Grants (§3, §14.2) ---

class DatasetGrantCreate(BaseModel):
    user_id: int = Field(..., description="ID của người dùng Analyst được cấp quyền")


class DatasetGrantOut(BaseModel):
    id: int
    dataset_id: int
    user_id: int
    granted_by: int
    created_at: datetime
    username: str | None = None

    model_config = {"from_attributes": True}


class SqlAccessDataset(BaseModel):
    dataset_id: int
    dataset_name: str
    schema_name: str = Field(..., description="Stable schema the Analyst queries: ds_<dataset id>")
    tables: list[str]


class SqlAccessOut(BaseModel):
    """Read-only SQL login for an Analyst; password only in the response that issues it."""

    enabled: bool
    has_credentials: bool = False
    host: str = ""
    port: int = 5432
    database: str = ""
    username: str = ""
    sslmode: str = "require"
    password: str | None = None
    datasets: list[SqlAccessDataset] = Field(default_factory=list)
