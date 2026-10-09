"""Session login & logout API — demo DPO / Analyst accounts (§4.1, §14.2)."""

import hashlib
import hmac
import threading
import time

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.api.deps import get_current_token, get_current_user
from src.api.session_store import SessionUser, create_session, invalidate_session
from src.audit.chain import record_audit_event
from src.config import get_settings
from src.db.models import DemoUser
from src.db.session import get_db
from src.models.schemas import SessionCreate, SessionResponse, UserRole

router = APIRouter(tags=["sessions"])


class AuthRateLimiter:
    """In-memory thread-safe sliding window rate limiter for login attempts."""

    def __init__(self, max_requests: int = 60, window_seconds: float = 60.0):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._lock = threading.Lock()
        self._requests: dict[str, list[float]] = {}

    def check(self, key: str) -> None:
        now = time.time()
        cutoff = now - self.window_seconds
        with self._lock:
            timestamps = self._requests.get(key, [])
            timestamps = [t for t in timestamps if t > cutoff]
            if len(timestamps) >= self.max_requests:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=(
                        f"Quá nhiều yêu cầu đăng nhập: tối đa {self.max_requests} "
                        f"lần trong {int(self.window_seconds)} giây. Vui lòng thử lại sau."
                    ),
                )
            timestamps.append(now)
            self._requests[key] = timestamps

    def reset(self) -> None:
        """Reset rate limiter state (mainly for tests)."""
        with self._lock:
            self._requests.clear()


_auth_rate_limiter: AuthRateLimiter | None = None


def get_auth_rate_limiter() -> AuthRateLimiter:
    global _auth_rate_limiter
    if _auth_rate_limiter is None:
        settings = get_settings()
        _auth_rate_limiter = AuthRateLimiter(
            max_requests=settings.auth_rate_limit_per_minute,
            window_seconds=60.0,
        )
    return _auth_rate_limiter


def reset_auth_rate_limiter() -> None:
    limiter = get_auth_rate_limiter()
    limiter.reset()


def _verify_password(stored: str, provided: str) -> bool:
    """Constant-time password comparison supporting both plaintext and SHA-256 hashes."""
    if hmac.compare_digest(stored, provided):
        return True
    hashed = hashlib.sha256(provided.encode("utf-8")).hexdigest()
    return hmac.compare_digest(stored, hashed)


@router.post("/sessions", response_model=SessionResponse)
def create_session_endpoint(
    body: SessionCreate,
    db: Session = Depends(get_db),
) -> SessionResponse:
    """Login with demo credentials. Role is assigned by the server from demo_users."""
    limiter = get_auth_rate_limiter()
    try:
        limiter.check(body.username)
    except HTTPException:
        record_audit_event(
            db,
            actor=SessionUser(id=0, username=body.username, role="ANONYMOUS"),
            action="login_rate_limited",
            entity_type="session",
            entity_id=body.username,
            reason=f"Exceeded max login attempts ({limiter.max_requests}/min)",
        )
        db.commit()
        raise

    user = db.scalar(select(DemoUser).where(DemoUser.username == body.username))
    if user is None or not _verify_password(user.password, body.password):
        # Audit failed login attempt (§3, §14.3)
        record_audit_event(
            db,
            actor=SessionUser(id=0, username=body.username, role="ANONYMOUS"),
            action="login_failed",
            entity_type="session",
            entity_id=body.username,
            reason="Invalid username or password",
        )
        db.commit()
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

    session_user = SessionUser(id=user.id, username=user.username, role=role.value)
    token = create_session(session_user)

    # Audit successful login (§3, §14.3)
    record_audit_event(
        db,
        actor=session_user,
        action="login",
        entity_type="session",
        entity_id=str(user.id),
        reason=f"User {user.username} authenticated successfully",
    )
    db.commit()

    return SessionResponse(
        access_token=token,
        token_type="bearer",
        username=user.username,
        role=role,
    )


@router.post("/sessions/logout")
def logout_endpoint(
    user: SessionUser = Depends(get_current_user),
    token: str = Depends(get_current_token),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    """Logout current session and invalidate bearer token (§4.1)."""
    invalidate_session(token)
    record_audit_event(
        db,
        actor=user,
        action="logout",
        entity_type="session",
        entity_id=str(user.id),
        reason=f"User {user.username} logged out",
    )
    db.commit()
    return {"message": "Logged out successfully"}
