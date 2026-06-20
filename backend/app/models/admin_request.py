"""Admin registration request model."""

from __future__ import annotations

import enum

from sqlalchemy import String, Enum
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class AdminRequestStatus(str, enum.Enum):
    """Status for admin requests."""

    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class AdminRequest(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Admin registration requests awaiting approval."""

    __tablename__ = "admin_requests"

    name: Mapped[str] = mapped_column(String(256), nullable=False)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    status: Mapped[AdminRequestStatus] = mapped_column(
        Enum(AdminRequestStatus, name="admin_request_status", native_enum=False),
        default=AdminRequestStatus.PENDING,
        nullable=False,
    )
