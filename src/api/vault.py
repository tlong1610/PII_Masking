"""Vault API router for controlled detokenization (§9.5, FR-13)."""

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from src.api.deps import require_dpo
from src.api.session_store import SessionUser
from src.db.session import get_db
from src.models.schemas import DetokenizeRequest, DetokenizeResponse
from src.vault.service import detokenize_value

router = APIRouter(prefix="/vault", tags=["vault"])


@router.post(
    "/detokenize",
    response_model=DetokenizeResponse,
    status_code=status.HTTP_200_OK,
    summary="Giải mã PII token có kiểm soát (chỉ DPO)",
    description=(
        "Endpoint dành riêng cho DPO để giải mã token trong các trường hợp nghiệp vụ "
        "hoặc thanh tra đặc biệt. Bắt buộc cung cấp lý do (tối thiểu 5 ký tự), giới hạn "
        "tần suất gọi và ghi nhật ký vào Audit Log (FR-13, §9.5)."
    ),
)
def detokenize(
    body: DetokenizeRequest,
    db: Session = Depends(get_db),
    user: SessionUser = Depends(require_dpo),
) -> DetokenizeResponse:
    """Detokenize a vault token with DPO authorization, reason, rate-limiting, and audit logging."""
    raw_value, token_rec = detokenize_value(
        db=db,
        token=body.token,
        reason=body.reason,
        actor=user,
    )
    return DetokenizeResponse(
        token=token_rec.token,
        raw_value=raw_value,
        entity_type=token_rec.entity_type,
        key_version=token_rec.key_version,
        decrypted_at=datetime.now(UTC),
    )
