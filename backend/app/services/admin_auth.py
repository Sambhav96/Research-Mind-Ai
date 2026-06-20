"""Admin Authentication service."""

from __future__ import annotations

import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

import bcrypt
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.errors import AppError
from app.db.session import get_db_session
from app.models.admin import Admin, AdminPasswordReset, AdminRole, AdminSession
from app.schemas.admin import (
    AdminLoginRequest,
    AdminRegisterRequest,
    AdminResponse,
    AdminTokenResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest,
)

_bearer_scheme = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class _AdminTokenBundle:
    response: AdminTokenResponse
    refresh_token: str
    refresh_expires_at: datetime


class AdminAuthService:
    """Admin Authentication service with JWT and refresh token rotation."""

    def __init__(self, session: AsyncSession, settings: Settings) -> None:
        self._session = session
        self._settings = settings

    async def get_admin_by_email(self, email: str) -> Admin | None:
        result = await self._session.execute(select(Admin).where(Admin.email == email))
        return result.scalar_one_or_none()

    async def get_admin_by_id(self, admin_id: UUID) -> Admin | None:
        result = await self._session.execute(select(Admin).where(Admin.id == admin_id))
        return result.scalar_one_or_none()

    async def login(self, payload: AdminLoginRequest) -> AdminTokenResponse:
        email = payload.email.strip().lower()
        admin = await self.get_admin_by_email(email)
        
        if not admin or not self._verify_password(payload.password, admin.password_hash):
            raise AppError(
                code="invalid_credentials",
                message="Invalid admin credentials",
                status_code=401,
            )
            
        if not admin.is_active or admin.deleted_at is not None:
            raise AppError(
                code="admin_inactive",
                message="Admin account is inactive or deleted",
                status_code=403,
            )

        tokens = self._generate_tokens(admin)
        
        admin_session = AdminSession(
            admin_id=admin.id,
            token=self._hash_refresh_token(tokens.refresh_token),
            expires_at=tokens.refresh_expires_at,
        )
        
        # Track last login
        admin.last_login = datetime.now(timezone.utc)
        self._session.add(admin)
        
        self._session.add(admin_session)
        await self._session.commit()

        return tokens.response

    async def register(self, payload: AdminRegisterRequest, creator_role: AdminRole | None) -> AdminTokenResponse:
        admin_count_result = await self._session.execute(select(func.count(Admin.id)))
        admin_count = admin_count_result.scalar() or 0

        if admin_count > 0:
            if creator_role != AdminRole.SUPER_ADMIN:
                raise AppError(
                    code="unauthorized",
                    message="Only SUPER_ADMIN can create new admins",
                    status_code=403,
                )
            new_role = AdminRole.ADMIN
        else:
            new_role = AdminRole.SUPER_ADMIN
            
        if payload.password != payload.confirm_password:
            raise AppError(
                code="password_mismatch",
                message="Passwords do not match",
                status_code=400,
            )
            
        email = payload.email.strip().lower()
        existing = await self.get_admin_by_email(email)
        if existing:
            raise AppError(
                code="email_in_use",
                message="Email is already registered as an admin",
                status_code=409,
            )

        password_hash = self._hash_password(payload.password)
        admin = Admin(
            email=email, 
            password_hash=password_hash, 
            name=payload.name,
            role=new_role
        )
        self._session.add(admin)
        await self._session.flush()

        tokens = self._generate_tokens(admin)
        
        admin_session = AdminSession(
            admin_id=admin.id,
            token=self._hash_refresh_token(tokens.refresh_token),
            expires_at=tokens.refresh_expires_at,
        )
        self._session.add(admin_session)
        await self._session.commit()

        return tokens.response

    async def refresh(self, refresh_token: str) -> AdminTokenResponse:
        payload = self._decode_token(refresh_token, expected_type="admin_refresh")
        admin_id = UUID(payload["sub"])

        admin = await self.get_admin_by_id(admin_id)
        if not admin or not admin.is_active or admin.deleted_at:
            raise AppError(
                code="invalid_admin",
                message="Invalid admin account",
                status_code=401,
            )

        token_hash = self._hash_refresh_token(refresh_token)
        result = await self._session.execute(
            select(AdminSession).where(
                AdminSession.admin_id == admin_id,
                AdminSession.token == token_hash,
                AdminSession.expires_at > datetime.now(timezone.utc)
            )
        )
        db_session = result.scalar_one_or_none()
        
        if not db_session:
            raise AppError(
                code="invalid_refresh",
                message="Invalid or expired refresh token",
                status_code=401,
            )

        # Delete old session to rotate
        await self._session.delete(db_session)

        tokens = self._generate_tokens(admin)
        
        new_session = AdminSession(
            admin_id=admin.id,
            token=self._hash_refresh_token(tokens.refresh_token),
            expires_at=tokens.refresh_expires_at,
        )
        self._session.add(new_session)
        await self._session.commit()

        return tokens.response

    async def logout(self, refresh_token: str) -> None:
        try:
            payload = self._decode_token(refresh_token, expected_type="admin_refresh")
            admin_id = UUID(payload["sub"])
            token_hash = self._hash_refresh_token(refresh_token)
            
            result = await self._session.execute(
                select(AdminSession).where(
                    AdminSession.admin_id == admin_id,
                    AdminSession.token == token_hash
                )
            )
            db_session = result.scalar_one_or_none()
            if db_session:
                await self._session.delete(db_session)
                await self._session.commit()
        except AppError:
            pass # ignore invalid token errors on logout

    async def forgot_password(self, payload: ForgotPasswordRequest) -> None:
        email = payload.email.strip().lower()
        admin = await self.get_admin_by_email(email)
        
        if admin and admin.is_active and not admin.deleted_at:
            reset_token = secrets.token_urlsafe(32)
            reset_record = AdminPasswordReset(
                admin_id=admin.id,
                token=reset_token,
                expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
                used=False
            )
            self._session.add(reset_record)
            await self._session.commit()
            
            # In a real system, send email here. 
            # For now, print to console to simulate.
            print(f"ADMIN RESET LINK GENERATED: /admin/reset-password?token={reset_token}")

    async def reset_password(self, payload: ResetPasswordRequest) -> None:
        if payload.password != payload.confirm_password:
            raise AppError(
                code="password_mismatch",
                message="Passwords do not match",
                status_code=400,
            )
            
        result = await self._session.execute(
            select(AdminPasswordReset).where(
                AdminPasswordReset.token == payload.token,
                AdminPasswordReset.used == False,
                AdminPasswordReset.expires_at > datetime.now(timezone.utc)
            )
        )
        reset_record = result.scalar_one_or_none()
        
        if not reset_record:
            raise AppError(
                code="invalid_token",
                message="Invalid or expired reset token",
                status_code=400,
            )
            
        admin = await self.get_admin_by_id(reset_record.admin_id)
        if not admin:
            raise AppError(
                code="invalid_admin",
                message="Admin not found",
                status_code=404,
            )
            
        admin.password_hash = self._hash_password(payload.password)
        reset_record.used = True
        
        self._session.add(admin)
        self._session.add(reset_record)
        
        # Optionally invalidate all existing sessions
        await self._session.execute(
            select(AdminSession).where(AdminSession.admin_id == admin.id)
        )
        await self._session.commit()

    async def get_current_admin(self, access_token: str) -> AdminResponse:
        payload = self._decode_token(access_token, expected_type="admin_access")
        admin_id = UUID(payload["sub"])
        admin = await self.get_admin_by_id(admin_id)
        
        if not admin or admin.deleted_at or not admin.is_active:
            raise AppError(
                code="admin_not_found",
                message="Admin not found or inactive",
                status_code=404,
            )
            
        return AdminResponse(
            id=admin.id,
            name=admin.name,
            email=admin.email,
            role=admin.role,
            is_active=admin.is_active,
            created_at=admin.created_at,
            updated_at=admin.updated_at,
        )

    async def get_current_admin_entity(self, access_token: str) -> Admin:
        payload = self._decode_token(access_token, expected_type="admin_access")
        admin_id = UUID(payload["sub"])
        admin = await self.get_admin_by_id(admin_id)
        
        if not admin or admin.deleted_at or not admin.is_active:
            raise AppError(
                code="admin_not_found",
                message="Admin not found or inactive",
                status_code=404,
            )
        return admin

    def _hash_password(self, password: str) -> str:
        rounds = self._settings.password_hash_rounds
        hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds))
        return hashed.decode("utf-8")

    def _verify_password(self, password: str, password_hash: str) -> bool:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))

    def _encode_token(self, subject: UUID, token_type: str, expires_delta: timedelta) -> str:
        now = datetime.now(timezone.utc)
        payload: dict[str, Any] = {
            "sub": str(subject),
            "typ": token_type,
            "iat": int(now.timestamp()),
            "exp": int((now + expires_delta).timestamp()),
            "iss": self._settings.jwt_issuer,
            "aud": "admin.scholarmind.api",
        }
        return jwt.encode(payload, self._settings.jwt_secret_key, algorithm=self._settings.jwt_algorithm)

    def _decode_token(self, token: str, expected_type: str) -> dict[str, Any]:
        try:
            payload = jwt.decode(
                token,
                self._settings.jwt_secret_key,
                algorithms=[self._settings.jwt_algorithm],
                audience="admin.scholarmind.api",
                issuer=self._settings.jwt_issuer,
            )
        except JWTError as exc:
            raise AppError(
                code="invalid_token",
                message="Invalid token",
                status_code=401,
            ) from exc

        if payload.get("typ") != expected_type:
            raise AppError(
                code="invalid_token_type",
                message="Invalid token type",
                status_code=401,
            )

        return payload

    def _hash_refresh_token(self, token: str) -> str:
        import hashlib
        return hashlib.sha256(token.encode("utf-8")).hexdigest()

    def _generate_tokens(self, admin: Admin) -> _AdminTokenBundle:
        access_delta = timedelta(minutes=self._settings.jwt_access_token_minutes)
        refresh_delta = timedelta(days=self._settings.jwt_refresh_token_days)

        access_token = self._encode_token(admin.id, "admin_access", access_delta)
        refresh_token = self._encode_token(admin.id, "admin_refresh", refresh_delta)

        refresh_expires_at = datetime.now(timezone.utc) + refresh_delta

        response = AdminTokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=int(access_delta.total_seconds()),
            refresh_expires_in=int(refresh_delta.total_seconds()),
        )
        return _AdminTokenBundle(
            response=response,
            refresh_token=refresh_token,
            refresh_expires_at=refresh_expires_at,
        )


def get_admin_auth_service(session: AsyncSession = Depends(get_db_session)) -> AdminAuthService:
    """Dependency provider for AdminAuthService."""
    return AdminAuthService(session=session, settings=get_settings())


def get_admin_bearer_token(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> str:
    """Extract bearer token from the Authorization header."""
    if not credentials:
        raise AppError(
            code="missing_token",
            message="Authorization token required",
            status_code=401,
        )
    return credentials.credentials


async def get_current_admin_entity(
    access_token: str = Depends(get_admin_bearer_token),
    service: AdminAuthService = Depends(get_admin_auth_service),
) -> Admin:
    """Dependency that returns the current admin entity."""
    return await service.get_current_admin_entity(access_token)


async def get_current_super_admin(
    admin: Admin = Depends(get_current_admin_entity),
) -> Admin:
    """Dependency that ensures the admin is a SUPER_ADMIN."""
    if admin.role != AdminRole.SUPER_ADMIN:
        raise AppError(
            code="forbidden",
            message="Requires SUPER_ADMIN privileges",
            status_code=403,
        )
    return admin
