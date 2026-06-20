"""Authentication schemas."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    """User registration request."""

    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: str | None = Field(default=None, max_length=256)


class LoginRequest(BaseModel):
    """User login request."""

    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """User response payload."""

    id: UUID
    email: EmailStr
    name: str | None = None
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: datetime


class UserUpdateRequest(BaseModel):
    """User update request."""

    name: str = Field(min_length=1, max_length=256)


class TokenResponse(BaseModel):
    """Token response payload."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    refresh_expires_in: int
