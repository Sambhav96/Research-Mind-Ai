"""Study session repository."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.study_session import StudySession


class StudySessionRepository:
    """Data access for study sessions."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, session_data: StudySession) -> StudySession:
        """Create a study session record."""
        self._session.add(session_data)
        await self._session.flush()
        return session_data

    async def get_by_id(self, session_id: UUID) -> StudySession | None:
        """Fetch a study session by id."""
        result = await self._session.execute(
            select(StudySession).where(StudySession.id == session_id, StudySession.is_deleted.is_(False))
        )
        return result.scalar_one_or_none()

    async def get_active_session(self, user_id: UUID, feature: str) -> StudySession | None:
        """Get the most recent active session for a user and feature."""
        result = await self._session.execute(
            select(StudySession)
            .where(
                StudySession.user_id == user_id,
                StudySession.feature_used == feature,
                StudySession.ended_at.is_(None),
                StudySession.is_deleted.is_(False),
            )
            .order_by(StudySession.started_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def end_session(self, session_data: StudySession, ended_at: datetime, duration_seconds: int) -> StudySession:
        """End a study session."""
        session_data.ended_at = ended_at
        session_data.duration_seconds = duration_seconds
        await self._session.flush()
        return session_data

    async def get_user_sessions(self, user_id: UUID, limit: int = 50) -> list[StudySession]:
        """Get recent study sessions for a user."""
        result = await self._session.execute(
            select(StudySession)
            .where(StudySession.user_id == user_id, StudySession.is_deleted.is_(False))
            .order_by(StudySession.started_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_stats(self, user_id: UUID) -> dict[str, int | list[dict]]:
        """Get study statistics for a user."""
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = now - timedelta(days=now.weekday())
        week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        INCLUDED_FEATURES = [
            "chat", "search", "flashcards", "quiz", "quiz_generated", 
            "quiz_started", "quiz_completed", "notes", "document_reading"
        ]

        today_stmt = select(func.coalesce(func.sum(StudySession.duration_seconds), 0)).where(
            StudySession.user_id == user_id,
            StudySession.started_at >= today_start,
            StudySession.is_deleted.is_(False),
            StudySession.feature_used.in_(INCLUDED_FEATURES),
        )
        week_stmt = select(func.coalesce(func.sum(StudySession.duration_seconds), 0)).where(
            StudySession.user_id == user_id,
            StudySession.started_at >= week_start,
            StudySession.is_deleted.is_(False),
            StudySession.feature_used.in_(INCLUDED_FEATURES),
        )
        month_stmt = select(func.coalesce(func.sum(StudySession.duration_seconds), 0)).where(
            StudySession.user_id == user_id,
            StudySession.started_at >= month_start,
            StudySession.is_deleted.is_(False),
            StudySession.feature_used.in_(INCLUDED_FEATURES),
        )

        today_seconds = (await self._session.execute(today_stmt)).scalar() or 0
        week_seconds = (await self._session.execute(week_stmt)).scalar() or 0
        month_seconds = (await self._session.execute(month_stmt)).scalar() or 0

        daily_breakdown = []
        for i in range(7):
            day_start = week_start + timedelta(days=i)
            day_end = day_start + timedelta(days=1)
            day_name = day_start.strftime("%a")
            day_stmt = select(func.coalesce(func.sum(StudySession.duration_seconds), 0)).where(
                StudySession.user_id == user_id,
                StudySession.started_at >= day_start,
                StudySession.started_at < day_end,
                StudySession.is_deleted.is_(False),
                StudySession.feature_used.in_(INCLUDED_FEATURES),
            )
            day_seconds = (await self._session.execute(day_stmt)).scalar() or 0
            daily_breakdown.append({"day": day_name, "seconds": day_seconds})

        feature_stmt = select(
            StudySession.feature_used, 
            func.coalesce(func.sum(StudySession.duration_seconds), 0)
        ).where(
            StudySession.user_id == user_id,
            StudySession.started_at >= today_start,
            StudySession.is_deleted.is_(False),
            StudySession.feature_used.in_(INCLUDED_FEATURES),
        ).group_by(StudySession.feature_used)
        
        feature_results = await self._session.execute(feature_stmt)
        feature_breakdown = {row[0]: row[1] for row in feature_results.all()}

        counts_stmt = select(
            StudySession.feature_used,
            func.count(StudySession.id)
        ).where(
            StudySession.user_id == user_id,
            StudySession.started_at >= week_start,
            StudySession.is_deleted.is_(False),
            StudySession.feature_used.in_(INCLUDED_FEATURES),
        ).group_by(StudySession.feature_used)
        
        counts_results = await self._session.execute(counts_stmt)
        weekly_feature_counts = {row[0]: row[1] for row in counts_results.all()}

        return {
            "today_seconds": today_seconds,
            "week_seconds": week_seconds,
            "month_seconds": month_seconds,
            "daily_breakdown": daily_breakdown,
            "feature_breakdown": feature_breakdown,
            "weekly_feature_counts": weekly_feature_counts,
        }
