import logging

from fastapi import APIRouter, Depends, HTTPException

from src.api import audit, auth, datasets, health, runs, sources, sql_access, users, vault
from src.api.deps import get_current_user, require_analyst_or_dpo, require_dpo
from src.api.session_store import SessionUser
from src.models.schemas import ChatRequest, ChatResponse

logger = logging.getLogger(__name__)

router = APIRouter()
router.include_router(auth.router)
router.include_router(sources.router)
router.include_router(runs.router)
router.include_router(datasets.router)
router.include_router(sql_access.router)
router.include_router(audit.router)
router.include_router(users.router)
router.include_router(vault.router)
router.include_router(health.router)


@router.get("/me")
def read_me(user: SessionUser = Depends(get_current_user)) -> dict:
    """Return the authenticated session user (role from server token)."""
    return {"id": user.id, "username": user.username, "role": user.role}


@router.get("/dpo-check")
def dpo_only_check(user: SessionUser = Depends(require_dpo)) -> dict:
    """Minimal DPO-only probe for auth guardrail tests."""
    return {"ok": True, "username": user.username, "role": user.role}


# Primary AI chat endpoint protected by RBAC (§14.2)
@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    user: SessionUser = Depends(require_analyst_or_dpo),
) -> ChatResponse:
    """Chat endpoint with LangGraph Assistant (RBAC Analyst/DPO §14.2)."""
    try:
        from src.agents.graph import agent

        result = await agent.ainvoke({"query": request.message})
        return ChatResponse(
            response=result.get("response", ""),
            analysis=result.get("analysis", ""),
        )
    except Exception as exc:
        logger.exception("Lỗi khi xử lý chat agent: %s", exc)
        raise HTTPException(
            status_code=500,
            detail="Lỗi xử lý nội bộ khi truy vấn AI Agent. Vui lòng thử lại sau.",
        )


@router.get("/status")
async def agent_status(
    user: SessionUser = Depends(require_analyst_or_dpo),
):
    """Agent status (RBAC Analyst/DPO §14.2). Unauthenticated probes use /healthz or /readyz (§17.1)."""
    return {"status": "ready", "agent": "LangGraph Agent v1.0", "user": user.username}
