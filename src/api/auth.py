"""Session login API — demo DPO / Analyst accounts."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.api.session_store import SessionUser, create_session
from src.db.models import DemoUser
from src.db.session import get_db
from src.models.schemas import SessionCreate, SessionResponse, UserRole

router = APIRouter(tags=["sessions"])


@router.post("/sessions", response_model=SessionResponse)
def create_session_endpoint(
    body: SessionCreate,
    db: Session = Depends(get_db),
) -> SessionResponse:
    """Login with demo credentials. Role is assigned by the server from demo_users."""
    user = db.scalar(select(DemoUser).where(DemoUser.username == body.username))
    if user is None or user.password != body.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    try:
        role = UserRole(user.role)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Invalid role configured for user",
        ) from exc

    token = create_session(
        SessionUser(id=user.id, username=user.username, role=role.value),
    )
    return SessionResponse(
        access_token=token,
        token_type="bearer",
        username=user.username,
        role=role,
    )
