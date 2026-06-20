from datetime import date, datetime, timedelta
from typing import Any
from uuid import UUID

from sqlalchemy import func, select, cast, Date
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document, DocumentStatus
from app.models.chat_session import ChatSession
from app.models.study_session import StudySession
from app.models.flashcard import FlashcardDeck
from app.models.quiz import QuizSet

class AnalyticsRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_document_counts(self, user_id: UUID) -> tuple[int, int]:
        doc_count_stmt = select(func.count(Document.id)).where(
            Document.owner_id == user_id, Document.is_deleted.is_(False)
        )
        ready_stmt = select(func.count(Document.id)).where(
            Document.owner_id == user_id,
            Document.status == DocumentStatus.ready.value,
            Document.is_deleted.is_(False),
        )
        doc_total = (await self.session.execute(doc_count_stmt)).scalar_one_or_none() or 0
        ready_total = (await self.session.execute(ready_stmt)).scalar_one_or_none() or 0
        return doc_total, ready_total

    async def get_chat_count(self, user_id: UUID) -> int:
        chat_count_stmt = select(func.count(ChatSession.id)).where(
            ChatSession.owner_id == user_id
        )
        chats_count = (await self.session.execute(chat_count_stmt)).scalar_one_or_none() or 0
        return chats_count

    async def get_study_session_stats(self, user_id: UUID) -> list[Any]:
        INCLUDED_FEATURES = [
            "chat", "search", "flashcards", "quiz", "quiz_started",
            "quiz_generated", "quiz_completed", "notes", "document_reading"
        ]
        stats_stmt = select(
            StudySession.feature_used, 
            func.count(StudySession.id).label("count"),
            func.coalesce(func.sum(StudySession.duration_seconds), 0).label("duration")
        ).where(
            StudySession.user_id == user_id, 
            StudySession.is_deleted.is_(False),
            StudySession.feature_used.in_(INCLUDED_FEATURES)
        ).group_by(StudySession.feature_used)
        
        stats_results = await self.session.execute(stats_stmt)
        return stats_results.all()

    async def get_weekly_study_chart_data(self, user_id: UUID, week_start: datetime) -> list[Any]:
        INCLUDED_FEATURES = [
            "chat", "search", "flashcards", "quiz", "quiz_started",
            "quiz_generated", "quiz_completed", "notes", "document_reading"
        ]
        chart_stmt = select(
            cast(StudySession.started_at, Date).label("day"),
            func.coalesce(func.sum(StudySession.duration_seconds), 0).label("duration")
        ).where(
            StudySession.user_id == user_id,
            StudySession.is_deleted.is_(False),
            StudySession.started_at >= week_start,
            StudySession.feature_used.in_(INCLUDED_FEATURES)
        ).group_by(
            cast(StudySession.started_at, Date)
        ).order_by("day")
        
        chart_results = await self.session.execute(chart_stmt)
        return chart_results.all()

    async def get_timeline_data(self, user_id: UUID, start_date: datetime) -> list[Any]:
        INCLUDED_FEATURES = [
            "chat", "flashcards", "quiz", "quiz_started",
            "quiz_generated", "quiz_completed", "notes"
        ]
        stmt = select(
            cast(StudySession.started_at, Date).label("day"),
            StudySession.feature_used,
            func.count(StudySession.id).label("count")
        ).where(
            StudySession.user_id == user_id,
            StudySession.is_deleted.is_(False),
            StudySession.started_at >= start_date,
            StudySession.feature_used.in_(INCLUDED_FEATURES)
        ).group_by(
            cast(StudySession.started_at, Date),
            StudySession.feature_used
        ).order_by("day")
        
        results = await self.session.execute(stmt)
        return results.all()

    async def get_all_documents(self, user_id: UUID) -> list[Document]:
        stmt = select(Document).where(
            Document.owner_id == user_id, Document.is_deleted.is_(False)
        )
        return list((await self.session.execute(stmt)).scalars().all())

    async def get_all_chat_sessions(self, user_id: UUID) -> list[ChatSession]:
        stmt = select(ChatSession).where(
            ChatSession.owner_id == user_id
        )
        return list((await self.session.execute(stmt)).scalars().all())

    async def get_chat_message_counts_by_session(self, user_id: UUID) -> dict[str, int]:
        from app.models.chat_message import ChatMessage
        stmt = select(
            ChatMessage.session_id,
            func.count(ChatMessage.id).label("count")
        ).join(ChatSession, ChatSession.id == ChatMessage.session_id).where(
            ChatSession.owner_id == user_id,
            ChatMessage.role == "user"
        ).group_by(ChatMessage.session_id)
        
        results = await self.session.execute(stmt)
        return {str(row.session_id): row.count for row in results.all()}

    async def get_all_flashcard_decks(self, user_id: UUID) -> list[FlashcardDeck]:
        stmt = select(FlashcardDeck).where(
            FlashcardDeck.owner_id == user_id
        )
        return list((await self.session.execute(stmt)).scalars().all())

    async def get_all_quiz_sets(self, user_id: UUID) -> list[QuizSet]:
        stmt = select(QuizSet).where(
            QuizSet.owner_id == user_id
        )
        return list((await self.session.execute(stmt)).scalars().all())

    async def get_active_dates(self, user_id: UUID) -> list[date]:
        INCLUDED_FEATURES = [
            "chat", "flashcards", "quiz_generated", "notes"
        ]
        stmt = select(
            cast(StudySession.started_at, Date).label("day")
        ).where(
            StudySession.user_id == user_id,
            StudySession.is_deleted.is_(False),
            StudySession.feature_used.in_(INCLUDED_FEATURES)
        ).group_by(
            cast(StudySession.started_at, Date)
        ).order_by(cast(StudySession.started_at, Date).desc())
        
        results = await self.session.execute(stmt)
        return [row.day for row in results.all()]
