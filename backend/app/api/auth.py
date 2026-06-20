"""Authentication routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, status

from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserResponse, UserUpdateRequest
from app.services.auth import AuthService, get_auth_service, get_bearer_token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, service: AuthService = Depends(get_auth_service)) -> TokenResponse:
    """Register a new user."""
    return await service.register(payload)


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, service: AuthService = Depends(get_auth_service)) -> TokenResponse:
    """Login a user."""
    return await service.login(payload)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    refresh_token: str = Depends(get_bearer_token),
    service: AuthService = Depends(get_auth_service),
) -> TokenResponse:
    """Rotate refresh token."""
    return await service.refresh(refresh_token)


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(
    refresh_token: str = Depends(get_bearer_token),
    service: AuthService = Depends(get_auth_service),
) -> dict[str, str]:
    """Logout the current user and revoke refresh token."""
    await service.logout(refresh_token)
    return {"status": "ok"}


@router.get("/me", response_model=UserResponse)
async def me(
    access_token: str = Depends(get_bearer_token),
    service: AuthService = Depends(get_auth_service),
) -> UserResponse:
    """Return the current user."""
    return await service.get_current_user(access_token)


@router.put("/me", response_model=UserResponse)
async def update_me(
    payload: UserUpdateRequest,
    access_token: str = Depends(get_bearer_token),
    service: AuthService = Depends(get_auth_service),
) -> UserResponse:
    """Update the current user."""
    return await service.update_user(access_token, payload)


# --- Password Reset (OTP) ---

from fastapi import BackgroundTasks
from app.schemas.password_reset import PasswordResetRequest, PasswordResetVerifyRequest, PasswordResetUpdateRequest, PasswordResetVerifyResponse
from app.services.password_reset import PasswordResetService
from app.db.session import get_db_session
from sqlalchemy.ext.asyncio import AsyncSession


@router.post("/password-reset/request", status_code=status.HTTP_200_OK)
async def request_password_reset_otp(
    payload: PasswordResetRequest,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, str]:
    """Request a password reset OTP (Step 1)."""
    service = PasswordResetService(session)
    await service.request_otp(payload, background_tasks)
    return {"status": "ok", "message": "If an account exists, an OTP has been sent."}


@router.post("/password-reset/verify", response_model=PasswordResetVerifyResponse)
async def verify_password_reset_otp(
    payload: PasswordResetVerifyRequest,
    session: AsyncSession = Depends(get_db_session),
) -> PasswordResetVerifyResponse:
    """Verify OTP and return a reset token (Step 2)."""
    service = PasswordResetService(session)
    token = await service.verify_otp(payload)
    return PasswordResetVerifyResponse(reset_token=token)


@router.post("/password-reset/update", status_code=status.HTTP_200_OK)
async def update_password(
    payload: PasswordResetUpdateRequest,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, str]:
    """Update password using reset token (Step 3)."""
    service = PasswordResetService(session)
    await service.update_password(payload, background_tasks)
    return {"status": "ok", "message": "Your password has been changed successfully."}

