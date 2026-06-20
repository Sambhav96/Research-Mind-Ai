"""Schemas for password reset."""

from pydantic import BaseModel, EmailStr, Field


class PasswordResetRequest(BaseModel):
    """Initial request for password reset (Step 1)."""

    email: EmailStr
    user_type: str = Field(pattern="^(user|admin)$", description="Type of user requesting reset")


class PasswordResetVerifyRequest(BaseModel):
    """Verify OTP (Step 2)."""

    email: EmailStr
    user_type: str = Field(pattern="^(user|admin)$")
    otp: str = Field(min_length=6, max_length=6, description="6-digit OTP code")


class PasswordResetVerifyResponse(BaseModel):
    """Response containing the reset token after successful OTP verification."""

    reset_token: str
    message: str = "OTP verified successfully."


class PasswordResetUpdateRequest(BaseModel):
    """Update password using reset token (Step 3)."""

    email: EmailStr
    user_type: str = Field(pattern="^(user|admin)$")
    reset_token: str = Field(..., description="Token received from OTP verification")
    new_password: str = Field(
        min_length=12,
        description="New password. Must be at least 12 chars, containing upper, lower, number, and special character."
    )
