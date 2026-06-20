"""Password reset logic."""

from __future__ import annotations

import logging
import secrets
import string
from datetime import datetime, timedelta, timezone
from uuid import uuid4

import bcrypt
from fastapi import BackgroundTasks
from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.errors import AppError
from app.models.admin import Admin, AdminSession
from app.models.otp import PasswordResetOTP
from app.models.user import User
from app.schemas.password_reset import PasswordResetRequest, PasswordResetUpdateRequest, PasswordResetVerifyRequest
from app.services.email import send_password_changed_success, send_password_reset_otp

logger = logging.getLogger(__name__)


class PasswordResetService:
    """Service for handling password resets."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.settings = get_settings()

    async def _user_exists(self, email: str, user_type: str) -> bool:
        """Check if a user or admin exists with the given email."""
        model = Admin if user_type == "admin" else User
        stmt = select(model.id).where(model.email == email)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none() is not None

    async def request_otp(self, payload: PasswordResetRequest, background_tasks: BackgroundTasks) -> None:
        """Generate and send an OTP if the account exists."""
        email = payload.email.strip().lower()
        user_type = payload.user_type

        if not await self._user_exists(email, user_type):
            logger.info(f"OTP requested for non-existent {user_type}: {email}")
            return  # Fail silently to prevent account enumeration

        # Limit resend frequency if an active unconsumed OTP exists
        stmt = select(PasswordResetOTP).where(
            PasswordResetOTP.email == email,
            PasswordResetOTP.user_type == user_type,
            PasswordResetOTP.consumed == False,
        )
        result = await self.session.execute(stmt)
        existing_otp = result.scalar_one_or_none()

        now = datetime.now(timezone.utc)

        if existing_otp:
            # Simple rate limiting: Don't allow new OTP if requested < 1 min ago
            if now < existing_otp.created_at + timedelta(minutes=1):
                logger.warning(f"OTP request throttled for {email}")
                # We still return silently to prevent enumeration
                return

            # Delete the old OTP
            await self.session.delete(existing_otp)

        # Generate 6-digit OTP
        otp_code = "".join(secrets.choice(string.digits) for _ in range(6))
        otp_hash = bcrypt.hashpw(otp_code.encode("utf-8"), bcrypt.gensalt(self.settings.password_hash_rounds)).decode("utf-8")

        new_otp = PasswordResetOTP(
            email=email,
            user_type=user_type,
            otp_hash=otp_hash,
            expires_at=now + timedelta(minutes=10),
            attempts_remaining=3,
        )
        self.session.add(new_otp)
        await self.session.commit()

        # Dispatch email asynchronously
        background_tasks.add_task(send_password_reset_otp, email, otp_code)
        logger.info(f"OTP generated and dispatched for {email}")

    async def verify_otp(self, payload: PasswordResetVerifyRequest) -> str:
        """Verify the OTP and return a reset token."""
        email = payload.email.strip().lower()
        now = datetime.now(timezone.utc)

        stmt = select(PasswordResetOTP).where(
            PasswordResetOTP.email == email,
            PasswordResetOTP.user_type == payload.user_type,
            PasswordResetOTP.consumed == False,
        )
        result = await self.session.execute(stmt)
        otp_record = result.scalar_one_or_none()

        if not otp_record:
            raise AppError("invalid_otp", "Invalid or expired OTP", 400)

        if now > otp_record.expires_at:
            raise AppError("otp_expired", "This OTP has expired. Please request a new one.", 400)

        if otp_record.attempts_remaining <= 0:
            raise AppError("too_many_attempts", "Too many invalid attempts. Please request a new OTP.", 400)

        # Verify hash
        if not bcrypt.checkpw(payload.otp.encode("utf-8"), otp_record.otp_hash.encode("utf-8")):
            otp_record.attempts_remaining -= 1
            await self.session.commit()
            raise AppError("invalid_otp", f"Invalid OTP. {otp_record.attempts_remaining} attempts remaining.", 400)

        # OTP is valid. Mark consumed and generate reset token.
        reset_token = str(uuid4())
        otp_record.consumed = True
        otp_record.reset_token = reset_token
        await self.session.commit()

        return reset_token

    async def update_password(self, payload: PasswordResetUpdateRequest, background_tasks: BackgroundTasks) -> None:
        """Update password using a verified reset token."""
        email = payload.email.strip().lower()

        # Find the consumed OTP record that matches this reset token
        stmt = select(PasswordResetOTP).where(
            PasswordResetOTP.email == email,
            PasswordResetOTP.user_type == payload.user_type,
            PasswordResetOTP.reset_token == payload.reset_token,
            PasswordResetOTP.consumed == True,
        )
        result = await self.session.execute(stmt)
        otp_record = result.scalar_one_or_none()

        if not otp_record:
            raise AppError("invalid_token", "Invalid or expired reset token.", 400)

        # Validate password strength
        pwd = payload.new_password
        if len(pwd) < 12:
            raise AppError("weak_password", "Password must be at least 12 characters", 400)
        if not any(c.isupper() for c in pwd):
            raise AppError("weak_password", "Password must contain an uppercase letter", 400)
        if not any(c.islower() for c in pwd):
            raise AppError("weak_password", "Password must contain a lowercase letter", 400)
        if not any(c.isdigit() for c in pwd):
            raise AppError("weak_password", "Password must contain a number", 400)
        if not any(c in string.punctuation for c in pwd):
            raise AppError("weak_password", "Password must contain a special character", 400)

        # Update the password
        new_hash = bcrypt.hashpw(pwd.encode("utf-8"), bcrypt.gensalt(self.settings.password_hash_rounds)).decode("utf-8")
        
        if payload.user_type == "admin":
            # Update admin and revoke all admin sessions
            admin_stmt = select(Admin).where(Admin.email == email)
            admin = (await self.session.execute(admin_stmt)).scalar_one_or_none()
            if admin:
                admin.password_hash = new_hash
                # Revoke refresh tokens
                await self.session.execute(delete(AdminSession).where(AdminSession.admin_id == admin.id))
        else:
            # Update user and revoke refresh token
            user_stmt = select(User).where(User.email == email)
            user = (await self.session.execute(user_stmt)).scalar_one_or_none()
            if user:
                user.password_hash = new_hash
                user.refresh_token_hash = None
                user.refresh_token_expires_at = None

        # Delete the OTP record so the token cannot be reused
        await self.session.delete(otp_record)
        await self.session.commit()

        # Send success email asynchronously
        background_tasks.add_task(send_password_changed_success, email)
        logger.info(f"Password updated successfully for {payload.user_type}: {email}")
