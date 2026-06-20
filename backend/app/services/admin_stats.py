"""Admin overview statistics service."""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone, date

from sqlalchemy import func, select, cast, Date
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chat_message import ChatMessage
from app.models.chat_session import ChatSession
from app.models.document import Document, DocumentStatus
from app.models.flashcard import FlashcardDeck
from app.models.note import Note
from app.models.quiz import QuizSet
from app.models.user import User
from app.models.workspace import Workspace
from app.models.user_metadata import UserMetadata
from app.models.invoice import Invoice
from app.models.error_log import ErrorLog
from app.models.ai_log import AILog
from app.schemas.admin_stats import (
    AdminOverviewResponse,
    AiUsageStats,
    ChartData,
    ChartDataPoint,
    DocumentStats,
    LearningStats,
    RecentActivityItem,
    ResearchStats,
    SystemHealth,
    UsersStats,
)


class AdminStatsService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_overview_stats(self) -> AdminOverviewResponse:
        now_utc = datetime.now(timezone.utc)
        today = now_utc.date()
        month_start = today.replace(day=1)
        week_start = now_utc - timedelta(days=6) # last 7 days including today

        # 1. Users Stats
        user_total_stmt = select(func.count(User.id))
        user_active_24h_stmt = select(func.count(User.id)).where(User.last_login_at >= now_utc - timedelta(days=1))
        user_active_7d_stmt = select(func.count(User.id)).where(User.last_login_at >= now_utc - timedelta(days=7))
        user_active_30d_stmt = select(func.count(User.id)).where(User.last_login_at >= now_utc - timedelta(days=30))
        user_today_stmt = select(func.count(User.id)).where(cast(User.created_at, Date) == today)
        user_month_stmt = select(func.count(User.id)).where(cast(User.created_at, Date) >= month_start)
        active_subs_stmt = select(func.count(UserMetadata.user_id)).where(UserMetadata.plan != 'free')
        revenue_stmt = select(func.sum(Invoice.amount)).where(Invoice.status == 'Success')

        # 2. Document Stats
        doc_total_stmt = select(func.count(Document.id))
        doc_ready_stmt = select(func.count(Document.id)).where(Document.status == DocumentStatus.ready.value)
        doc_error_stmt = select(func.count(Document.id)).where(Document.status == DocumentStatus.failed.value)
        doc_storage_stmt = select(func.sum(Document.file_size))

        # 3. AI Usage Stats
        chat_total_stmt = select(func.count(ChatSession.id))
        ai_req_stmt = select(func.count(ChatMessage.id)).where(ChatMessage.role == "user")
        ai_failed_stmt = select(func.count(AILog.id)).where(AILog.status == 'failed')
        
        # Approximate tokens based on AILog or extrapolate
        ai_tokens_stmt = select(func.sum(AILog.latency_ms)) # just as an approximation if token column doesn't exist

        # 4. Learning Stats
        flashcards_stmt = select(func.count(FlashcardDeck.id))
        quizzes_stmt = select(func.count(QuizSet.id))
        notes_stmt = select(func.count(Note.id))

        # 5. Research Stats
        workspaces_stmt = select(func.count(Workspace.id))

        # DB Health
        db_health_stmt = select(1)
        bg_jobs_failed_stmt = select(func.count(ErrorLog.id)).where(ErrorLog.severity == 'error')

        # Execute all scalars sequentially to prevent SQLAlchemy concurrent session errors
        u_total = await self._session.scalar(user_total_stmt) or 0
        u_active_24h = await self._session.scalar(user_active_24h_stmt) or 0
        u_active_7d = await self._session.scalar(user_active_7d_stmt) or 0
        u_active_30d = await self._session.scalar(user_active_30d_stmt) or 0
        u_today = await self._session.scalar(user_today_stmt) or 0
        u_month = await self._session.scalar(user_month_stmt) or 0
        u_subs = await self._session.scalar(active_subs_stmt) or 0
        rev = await self._session.scalar(revenue_stmt) or 0.0
        
        d_total = await self._session.scalar(doc_total_stmt) or 0
        d_ready = await self._session.scalar(doc_ready_stmt) or 0
        d_error = await self._session.scalar(doc_error_stmt) or 0
        d_storage = await self._session.scalar(doc_storage_stmt) or 0
        
        c_total = await self._session.scalar(chat_total_stmt) or 0
        c_req = await self._session.scalar(ai_req_stmt) or 0
        c_failed = await self._session.scalar(ai_failed_stmt) or 0
        
        f_total = await self._session.scalar(flashcards_stmt) or 0
        q_total = await self._session.scalar(quizzes_stmt) or 0
        n_total = await self._session.scalar(notes_stmt) or 0
        w_total = await self._session.scalar(workspaces_stmt) or 0
        db_health = await self._session.scalar(db_health_stmt) or 0
        bg_failed = await self._session.scalar(bg_jobs_failed_stmt) or 0

        # 6. Charts Data (Last 7 Days)
        user_chart_stmt = select(
            cast(User.created_at, Date).label("day"),
            func.count(User.id)
        ).where(User.created_at >= week_start).group_by(cast(User.created_at, Date))

        doc_chart_stmt = select(
            cast(Document.created_at, Date).label("day"),
            func.count(Document.id)
        ).where(Document.created_at >= week_start).group_by(cast(Document.created_at, Date))

        chat_chart_stmt = select(
            cast(ChatMessage.created_at, Date).label("day"),
            func.count(ChatMessage.id)
        ).where(ChatMessage.created_at >= week_start).group_by(cast(ChatMessage.created_at, Date))

        u_chart_res = await self._session.execute(user_chart_stmt)
        d_chart_res = await self._session.execute(doc_chart_stmt)
        c_chart_res = await self._session.execute(chat_chart_stmt)

        u_chart = {row[0]: row[1] for row in u_chart_res.all()}
        d_chart = {row[0]: row[1] for row in d_chart_res.all()}
        c_chart = {row[0]: row[1] for row in c_chart_res.all()}

        user_growth, doc_growth, ai_trend, daily_act = [], [], [], []
        
        for i in range(7):
            d = (now_utc - timedelta(days=6-i)).date()
            d_str = d.strftime("%b %d")
            
            u_cnt = u_chart.get(d, 0)
            d_cnt = d_chart.get(d, 0)
            c_cnt = c_chart.get(d, 0)
            
            user_growth.append(ChartDataPoint(date=d_str, count=u_cnt))
            doc_growth.append(ChartDataPoint(date=d_str, count=d_cnt))
            ai_trend.append(ChartDataPoint(date=d_str, count=c_cnt))
            # Mock daily activity combining these
            daily_act.append(ChartDataPoint(date=d_str, count=c_cnt + (d_cnt * 2)))

        # 7. Recent Activity (Combines docs, chats, quizzes, flashcards)
        recent_docs = await self._session.execute(
            select(Document.id, Document.title, Document.created_at)
            .order_by(Document.created_at.desc()).limit(5)
        )
        recent_quizzes = await self._session.execute(
            select(QuizSet.id, QuizSet.title, QuizSet.created_at)
            .order_by(QuizSet.created_at.desc()).limit(5)
        )
        recent_flashcards = await self._session.execute(
            select(FlashcardDeck.id, FlashcardDeck.document_name, FlashcardDeck.created_at)
            .order_by(FlashcardDeck.created_at.desc()).limit(5)
        )
        recent_workspaces = await self._session.execute(
            select(Workspace.id, Workspace.name, Workspace.created_at)
            .order_by(Workspace.created_at.desc()).limit(5)
        )
        recent_notes = await self._session.execute(
            select(Note.id, Note.title, Note.created_at)
            .order_by(Note.created_at.desc()).limit(5)
        )
        recent_chats = await self._session.execute(
            select(ChatSession.id, ChatSession.title, ChatSession.created_at)
            .order_by(ChatSession.created_at.desc()).limit(5)
        )

        def _ensure_aware(dt):
            if dt is None:
                return now_utc
            if dt.tzinfo is None:
                return dt.replace(tzinfo=timezone.utc)
            return dt

        activities = []
        for doc in recent_docs.all():
            activities.append({"id": str(doc[0]), "type": "document", "title": f"Paper uploaded: {doc[1] or 'Untitled'}", "ts": _ensure_aware(doc[2])})
        for quiz in recent_quizzes.all():
            activities.append({"id": str(quiz[0]), "type": "quiz", "title": f"Quiz generated: {quiz[1]}", "ts": _ensure_aware(quiz[2])})
        for fc in recent_flashcards.all():
            activities.append({"id": str(fc[0]), "type": "flashcard", "title": f"Flashcard deck created: {fc[1] or 'Untitled'}", "ts": _ensure_aware(fc[2])})
        for ws in recent_workspaces.all():
            activities.append({"id": str(ws[0]), "type": "workspace", "title": f"Workspace created: {ws[1]}", "ts": _ensure_aware(ws[2])})
        for note in recent_notes.all():
            activities.append({"id": str(note[0]), "type": "note", "title": f"Note generated: {note[1]}", "ts": _ensure_aware(note[2])})
        for chat in recent_chats.all():
            activities.append({"id": str(chat[0]), "type": "chat", "title": f"Chat session started: {chat[1] or 'Untitled'}", "ts": _ensure_aware(chat[2])})
            
        activities.sort(key=lambda x: x["ts"], reverse=True)
        recent_activity_items = []
        for a in activities[:6]:
            diff = now_utc.replace(tzinfo=None) - a["ts"].replace(tzinfo=None)
            minutes = diff.total_seconds() // 60
            if minutes < 60:
                time_str = f"{int(minutes)}m ago" if minutes > 0 else "Just now"
            elif minutes < 1440:
                time_str = f"{int(minutes // 60)}h ago"
            else:
                time_str = f"{int(minutes // 1440)}d ago"

            recent_activity_items.append(RecentActivityItem(
                id=a["id"],
                type=a["type"],
                title=a["title"],
                time=time_str
            ))

        return AdminOverviewResponse(
            users=UsersStats(
                total=u_total,
                active_24h=u_active_24h,
                active_7d=u_active_7d,
                active_30d=u_active_30d,
                new_today=u_today,
                new_this_month=u_month,
                active_subscriptions=u_subs,
                revenue=float(rev),
            ),
            documents=DocumentStats(
                total_uploaded=d_total,
                total_processed=d_ready,
                failed_processing=d_error,
                storage_usage_bytes=d_storage,
            ),
            ai_usage=AiUsageStats(
                total_chats=c_total,
                ai_requests=c_req,
                token_consumption=c_req * 185, # Extrapolated
                failed_requests=c_failed,
            ),
            learning=LearningStats(
                flashcards_generated=f_total,
                quizzes_generated=q_total,
                notes_generated=n_total,
            ),
            research=ResearchStats(
                workspaces_created=w_total,
                papers_uploaded=d_total, 
            ),
            charts=ChartData(
                user_growth=user_growth,
                document_growth=doc_growth,
                ai_usage_trend=ai_trend,
                daily_activity=daily_act,
            ),
            recent_activity=recent_activity_items,
            system_health=SystemHealth(
                frontend="Operational",
                backend="Operational",
                database="Operational" if db_health else "Degraded",
                failed_background_jobs=bg_failed,
            )
        )
