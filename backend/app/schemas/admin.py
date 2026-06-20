"""Admin validation schemas."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.models.admin import AdminRole


class AdminLoginRequest(BaseModel):
    """Admin login request."""

    email: EmailStr
    password: str


class AdminRegisterRequest(BaseModel):
    """Admin registration request (only for super admins)."""

    name: str | None = Field(default=None, max_length=256)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    confirm_password: str = Field(min_length=8, max_length=128)


class AdminResponse(BaseModel):
    """Admin response payload."""

    id: UUID
    name: str | None = None
    email: EmailStr
    role: AdminRole
    is_active: bool
    created_at: datetime
    updated_at: datetime


class AdminTokenResponse(BaseModel):
    """Admin token response payload."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    refresh_expires_in: int


class ForgotPasswordRequest(BaseModel):
    """Forgot password request."""

    email: EmailStr


class ResetPasswordRequest(BaseModel):
    """Reset password request."""

    token: str
    password: str = Field(min_length=8, max_length=128)
    confirm_password: str = Field(min_length=8, max_length=128)
