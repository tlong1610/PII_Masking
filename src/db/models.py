"""ORM models for PIIGuard app metadata (no raw PII values)."""

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base


class DemoUser(Base):
    """Demo login accounts — role is assigned by the server, never by the client."""

    __tablename__ = "demo_users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    # Demo-only plaintext password; not for production auth.
    password: Mapped[str] = mapped_column(String(128), nullable=False)
    role: Mapped[str] = mapped_column(String(16), nullable=False)  # DPO | ANALYST
