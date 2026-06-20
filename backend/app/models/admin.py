"""Admin authentication models."""

from __future__ import annotations

import enum
from datetime import datetime
from uuid import UUID

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class AdminRole(str, enum.Enum):
    """Admin roles enum."""

    SUPER_ADMIN = "SUPER_ADMIN"
    ADMIN = "ADMIN"
    SUPPORT_ADMIN = "SUPPORT_ADMIN"
    AUDITOR = "AUDITOR"

class AdminAuditLog(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Admin audit log ORM model."""

    __tablename__ = "admin_audit_logs"

    admin_id: Mapped[UUID] = mapped_column(ForeignKey("admins.id", ondelete="CASCADE"), index=True, nullable=False)
    action: Mapped[str] = mapped_column(String(128), nullable=False)
    target_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    target_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    details: Mapped[str | None] = mapped_column(String, nullable=True)


class Admin(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Admin user ORM model. Completely isolated from normal users."""

    __tablename__ = "admins"

    name: Mapped[str | None] = mapped_column(String(256), nullable=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    role: Mapped[AdminRole] = mapped_column(
        Enum(AdminRole, name="admin_role", native_enum=False),
        default=AdminRole.ADMIN,
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_login: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    def soft_delete(self, timestamp: datetime) -> None:
        """Mark the admin as deleted."""
        self.deleted_at = timestamp
        self.is_active = False


class AdminSession(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Admin session ORM model for refresh tokens."""

    __tablename__ = "admin_sessions"

    admin_id: Mapped[UUID] = mapped_column(ForeignKey("admins.id", ondelete="CASCADE"), index=True, nullable=False)
    token: Mapped[str] = mapped_column(String(512), unique=True, index=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class AdminPasswordReset(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Admin password reset tokens."""

    __tablename__ = "admin_password_resets"

    admin_id: Mapped[UUID] = mapped_column(ForeignKey("admins.id", ondelete="CASCADE"), index=True, nullable=False)
    token: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
