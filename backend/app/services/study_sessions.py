"""Study session service."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.models.study_session import FeatureType, StudySession
from app.repositories.study_session import StudySessionRepository


class StudySessionService:
    """Service for managing study sessions."""

    def __init__(self, session: AsyncSession, settings: Settings) -> None:
        self._session = session
        self._settings = settings
        self._repo = StudySessionRepository(session)

    async def start_session(self, user_id: UUID, feature_used: str) -> StudySession:
        """Start a new study session."""
        feature = FeatureType(feature_used)
        existing = await self._repo.get_active_session(user_id, feature.value)
        if existing:
            return existing

        now = datetime.now(timezone.utc)
        session_data = StudySession(
            user_id=user_id,
            feature_used=feature.value,
            started_at=now,
        )
        result = await self._repo.create(session_data)
        await self._session.commit()
        return result

    async def end_session(self, session_id: UUID, duration_seconds: int) -> StudySession | None:
        """End an active study session."""
        existing = await self._repo.get_by_id(session_id)
        if not existing or existing.ended_at is not None:
            return None
        now = datetime.now(timezone.utc)
        result = await self._repo.end_session(existing, now, duration_seconds)
        await self._session.commit()
        return result

    async def get_stats(self, user_id: UUID) -> dict:
        """Get study statistics for a user."""
        return await self._repo.get_stats(user_id)

    async def get_recent_sessions(self, user_id: UUID, limit: int = 20) -> list[StudySession]:
        """Get recent study sessions."""
        return await self._repo.get_user_sessions(user_id, limit)
