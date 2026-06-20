"""User repository."""

from __future__ import annotations

from datetime import datetime
from typing import Sequence
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


class UserRepository:
    """Data access for users."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, user_id: UUID) -> User | None:
        """Fetch a user by ID."""
        result = await self._session.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> User | None:
        """Fetch a user by email."""
        result = await self._session.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def create(self, user: User) -> User:
        """Create a new user record."""
        self._session.add(user)
        await self._session.flush()
        return user

    async def update_refresh_token(
        self,
        user: User,
        token_hash: str,
        expires_at: datetime,
    ) -> None:
        """Update refresh token hash and expiry for a user."""
        user.refresh_token_hash = token_hash
        user.refresh_token_expires_at = expires_at
        await self._session.flush()

    async def clear_refresh_token(self, user: User) -> None:
        """Clear refresh token details for a user."""
        user.refresh_token_hash = None
        user.refresh_token_expires_at = None
        await self._session.flush()
