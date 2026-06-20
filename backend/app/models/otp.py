"""Password Reset OTP model."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import Boolean, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class PasswordResetOTP(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """OTP model for password resets (both users and admins)."""

    __tablename__ = "password_reset_otps"

    email: Mapped[str] = mapped_column(String(320), index=True, nullable=False)
    user_type: Mapped[str] = mapped_column(String(10), nullable=False)  # "user" or "admin"
    otp_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    attempts_remaining: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    resend_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    consumed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    reset_token: Mapped[str | None] = mapped_column(String(128), unique=True, index=True, nullable=True)
