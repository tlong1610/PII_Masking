import logging
from collections.abc import Sequence

from src.agents.graph import agent as three_tier_agent
from src.models.schemas import ColumnProfile, FieldProfile, FieldScanProposal, PolicyAction

logger = logging.getLogger(__name__)

async def scan_field_profiles(profiles: Sequence[FieldProfile]) -> list[FieldScanProposal]:
    """
    Entrypoint cho luồng Enterprise Gate 2 (Sử dụng nguyên bản Phễu 3 Tầng).
    Nhận FieldProfile (có thể chứa raw samples),
    Map sang ColumnProfile và đẩy qua Phễu 3 tầng gốc.
    """
    proposals: list[FieldScanProposal] = []

    for profile in profiles:
        try:
            # Flatten path cho MongoDB (VD: identity.cccd -> identity_cccd)
            flat_column_name = profile.path.replace(".", "_")

            # Map FieldProfile -> ColumnProfile để chui lọt phễu 3 tầng cũ
            col_profile = ColumnProfile(
                table_name=profile.table_or_collection,
                column_name=flat_column_name,
                data_type=profile.data_type,
                is_primary_key=False,
                is_foreign_key=False,
                samples=profile.samples or [],
                system_recommendation=None
            )

            # Gửi vào LangGraph (Phễu 3 tầng nguyên bản)
            result_state = await three_tier_agent.ainvoke({"column_profile": col_profile})

            # Lấy kết quả từ phễu 3 tầng
            final_result = result_state.get("final_proposal")

            if final_result:
                # Map lại từ FieldScanResult -> FieldScanProposal
                proposals.append(FieldScanProposal(
                    field_path=profile.path, # Giữ nguyên path gốc có dấu chấm
                    classification=final_result.inferred_pii_type,
                    action=PolicyAction(final_result.recommended_action),
                    reason=final_result.reasoning,
                    confidence=final_result.confidence,
                    tier=final_result.tier,
                    provider_meta=getattr(final_result, "provider_meta", None)
                ))
            else:
                logger.warning("No proposal generated for %s", profile.path)
                proposals.append(FieldScanProposal(
                    field_path=profile.path,
                    classification="UNKNOWN",
                    action=PolicyAction.KEEP,
                    reason="Hệ thống không trả về kết quả",
                    confidence=0.0,
                    tier="UNKNOWN"
                ))

        except Exception as e:
            logger.exception("Error scanning profile %s: %s", profile.path, e)
            proposals.append(FieldScanProposal(
                field_path=profile.path,
                classification="UNKNOWN",
                action=PolicyAction.KEEP,
                reason=f"Lỗi hệ thống: {str(e)}",
                confidence=0.0,
                tier="ERROR"
            ))

    return proposals
