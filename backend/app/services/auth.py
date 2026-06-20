"""Authentication service."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.errors import AppError
from app.db.session import get_db_session
from app.models.user import User
from app.repositories.user import UserRepository
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserResponse, UserUpdateRequest


_bearer_scheme = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class _TokenBundle:
    response: TokenResponse
    refresh_hash: str
    refresh_expires_at: datetime


class AuthService:
    """Authentication service with JWT and refresh token rotation."""

    def __init__(self, session: AsyncSession, settings: Settings) -> None:
        self._session = session
        self._settings = settings
        self._repo = UserRepository(session)

    async def register(self, payload: RegisterRequest) -> TokenResponse:
        """Register a new user and return tokens."""
        email = payload.email.strip().lower()
        existing = await self._repo.get_by_email(email)
        if existing:
            raise AppError(
                code="email_in_use",
                message="Email is already registered",
                status_code=409,
            )

        password_hash = self._hash_password(payload.password)
        user = User(email=email, password_hash=password_hash, name=payload.name)
        self._session.add(user)
        await self._session.flush()

        tokens = self._generate_tokens(user)
        await self._repo.update_refresh_token(
            user,
            tokens.refresh_hash,
            tokens.refresh_expires_at,
        )
        await self._session.commit()

        return tokens.response

    async def login(self, payload: LoginRequest) -> TokenResponse:
        """Authenticate a user and return tokens."""
        email = payload.email.strip().lower()
        user = await self._repo.get_by_email(email)
        if not user or not self._verify_password(payload.password, user.password_hash):
            raise AppError(
                code="invalid_credentials",
                message="Invalid credentials",
                status_code=401,
            )
        if not user.is_active or user.is_deleted:
            raise AppError(
                code="user_inactive",
                message="User is inactive",
                status_code=403,
            )

        user.mark_login(datetime.now(timezone.utc))
        tokens = self._generate_tokens(user)

        self._session.add(user)
        await self._repo.update_refresh_token(
            user,
            tokens.refresh_hash,
            tokens.refresh_expires_at,
        )
        await self._session.commit()

        return tokens.response

    async def refresh(self, refresh_token: str) -> TokenResponse:
        """Rotate refresh token and return new tokens."""
        payload = self._decode_token(refresh_token, expected_type="refresh")
        user_id = __import__("uuid").UUID(payload["sub"])

        user = await self._repo.get_by_id(user_id)
        if not user or not user.refresh_token_hash:
            raise AppError(
                code="invalid_refresh",
                message="Invalid refresh token",
                status_code=401,
            )

        if (
            not user.refresh_token_expires_at
            or user.refresh_token_expires_at < datetime.now(timezone.utc)
        ):
            raise AppError(
                code="refresh_expired",
                message="Refresh token expired",
                status_code=401,
            )

        if not self._verify_refresh_token(refresh_token, user.refresh_token_hash):
            raise AppError(
                code="invalid_refresh",
                message="Invalid refresh token",
                status_code=401,
            )

        tokens = self._generate_tokens(user)
        user.refresh_token_hash = tokens.refresh_hash
        user.refresh_token_expires_at = tokens.refresh_expires_at
        self._session.add(user)
        await self._session.commit()

        return tokens.response

    async def logout(self, refresh_token: str) -> None:
        """Invalidate the refresh token for a user."""
        payload = self._decode_token(refresh_token, expected_type="refresh")
        user_id = __import__("uuid").UUID(payload["sub"])
        user = await self._repo.get_by_id(user_id)
        if not user:
            return

        user.refresh_token_hash = None
        user.refresh_token_expires_at = None
        self._session.add(user)
        await self._session.commit()

    async def get_current_user(self, access_token: str) -> UserResponse:
        """Return the current authenticated user."""
        payload = self._decode_token(access_token, expected_type="access")
        user_id = __import__("uuid").UUID(payload["sub"])
        user = await self._repo.get_by_id(user_id)
        if not user or user.is_deleted or not user.is_active:
            raise AppError(
                code="user_not_found",
                message="User not found",
                status_code=404,
            )
        return UserResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            is_active=user.is_active,
            is_verified=user.is_verified,
            created_at=user.created_at,
            updated_at=user.updated_at,
        )

    async def update_user(self, access_token: str, payload: UserUpdateRequest) -> UserResponse:
        """Update the current user details."""
        user = await self.get_current_user_entity(access_token)
        user.name = payload.name
        self._session.add(user)
        await self._session.commit()
        return UserResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            is_active=user.is_active,
            is_verified=user.is_verified,
            created_at=user.created_at,
            updated_at=user.updated_at,
        )

    async def get_current_user_entity(self, access_token: str) -> User:
        """Return the current authenticated user entity."""
        payload = self._decode_token(access_token, expected_type="access")
        user_id = __import__("uuid").UUID(payload["sub"])
        user = await self._repo.get_by_id(user_id)
        if not user or user.is_deleted or not user.is_active:
            raise AppError(
                code="user_not_found",
                message="User not found",
                status_code=404,
            )
        return user

    def _hash_password(self, password: str) -> str:
        rounds = self._settings.password_hash_rounds
        hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds))
        return hashed.decode("utf-8")

    def _verify_password(self, password: str, password_hash: str) -> bool:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))

    def _encode_token(self, subject: __import__("uuid").UUID, token_type: str, expires_delta: timedelta) -> str:
        now = datetime.now(timezone.utc)
        payload: dict[str, Any] = {
            "sub": str(subject),
            "typ": token_type,
            "iat": int(now.timestamp()),
            "exp": int((now + expires_delta).timestamp()),
            "iss": self._settings.jwt_issuer,
            "aud": self._settings.jwt_audience,
        }
        return jwt.encode(payload, self._settings.jwt_secret_key, algorithm=self._settings.jwt_algorithm)

    def _decode_token(self, token: str, expected_type: str) -> dict[str, Any]:
        try:
            payload = jwt.decode(
                token,
                self._settings.jwt_secret_key,
                algorithms=[self._settings.jwt_algorithm],
                audience=self._settings.jwt_audience,
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

    def _verify_refresh_token(self, token: str, token_hash: str) -> bool:
        # Fallback to bcrypt check for old tokens
        if token_hash.startswith("$2b$"):
            return bcrypt.checkpw(token.encode("utf-8"), token_hash.encode("utf-8"))
        
        import hashlib
        import hmac
        expected_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
        return hmac.compare_digest(expected_hash, token_hash)

    def _generate_tokens(self, user: User) -> "_TokenBundle":
        access_delta = timedelta(minutes=self._settings.jwt_access_token_minutes)
        refresh_delta = timedelta(days=self._settings.jwt_refresh_token_days)

        access_token = self._encode_token(user.id, "access", access_delta)
        refresh_token = self._encode_token(user.id, "refresh", refresh_delta)

        refresh_hash = self._hash_refresh_token(refresh_token)
        refresh_expires_at = datetime.now(timezone.utc) + refresh_delta

        response = TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=int(access_delta.total_seconds()),
            refresh_expires_in=int(refresh_delta.total_seconds()),
        )
        return _TokenBundle(
            response=response,
            refresh_hash=refresh_hash,
            refresh_expires_at=refresh_expires_at,
        )


def get_auth_service(session: AsyncSession = Depends(get_db_session)) -> AuthService:
    """Dependency provider for AuthService."""
    return AuthService(session=session, settings=get_settings())


def get_bearer_token(
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


async def get_current_user_entity(
    access_token: str = Depends(get_bearer_token),
    service: AuthService = Depends(get_auth_service),
) -> User:
    """Dependency that returns the current user entity."""
    return await service.get_current_user_entity(access_token)
