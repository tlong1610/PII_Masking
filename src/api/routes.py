from fastapi import APIRouter, Depends, HTTPException

from src.agents.graph import agent
from src.api import auth, runs, sources
from src.api.deps import get_current_user, require_dpo
from src.api.session_store import SessionUser
from src.models.schemas import ChatRequest, ChatResponse

router = APIRouter()
router.include_router(auth.router)
router.include_router(sources.router)
router.include_router(runs.router)


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    """Chat với AI agent."""
    try:
        result = await agent.ainvoke({"query": request.message})
        return ChatResponse(
            response=result.get("response", ""),
            analysis=result.get("analysis", ""),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
async def agent_status():
    """Kiểm tra trạng thái agent."""
    return {"status": "ready", "agent": "LangGraph Agent v1.0"}


@router.get("/me")
def read_me(user: SessionUser = Depends(get_current_user)) -> dict:
    """Return the authenticated session user (role from server token)."""
    return {"id": user.id, "username": user.username, "role": user.role}


@router.get("/dpo-check")
def dpo_only_check(user: SessionUser = Depends(require_dpo)) -> dict:
    """Minimal DPO-only probe for auth guardrail tests."""
    return {"ok": True, "username": user.username, "role": user.role}
