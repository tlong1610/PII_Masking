"""Auth dependencies — role comes from server session, never from the client."""

from __future__ import annotations

from fastapi import Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from src.api.session_store import SessionUser, get_session_user
from src.models.schemas import UserRole

_bearer = HTTPBearer(auto_error=False)


def get_current_token(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    token: str | None = Query(None, description="Optional bearer token for browser report downloads"),
) -> str:
    if credentials is not None and credentials.scheme.lower() == "bearer":
        return credentials.credentials
    if token:
        return token
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Missing or invalid Authorization Bearer token",
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    token: str | None = Query(None, description="Optional bearer token for browser report downloads"),
) -> SessionUser:
    raw_token = get_current_token(credentials, token)
    user = get_session_user(raw_token)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session token",
        )
    return user



def require_dpo(user: SessionUser = Depends(get_current_user)) -> SessionUser:
    if user.role != UserRole.DPO.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="DPO role required",
        )
    return user


def require_analyst_or_dpo(user: SessionUser = Depends(get_current_user)) -> SessionUser:
    if user.role not in (UserRole.DPO.value, UserRole.ANALYST.value):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Authenticated role required",
        )
    return user
