"""Analytics routes."""

from __future__ import annotations

import asyncio
from datetime import date, datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select, cast, Date
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.session import get_db_session
from app.models.chat_message import ChatMessage
from app.models.chat_session import ChatSession
from app.models.document import Document, DocumentStatus
from app.models.user import User
from app.models.note import Note
from app.services.auth import get_current_user_entity


router = APIRouter(prefix="/analytics", tags=["analytics"])


class MetricResponse(BaseModel):
    label: str
    value: str | int
    change: str
    icon: str
    color: str
    breakdown: dict[str, int] | None = None


class ActivityItemResponse(BaseModel):
    id: str
    type: str  # "upload", "chat", "quiz", "flashcard", "summary", "search"
    title: str
    description: str
    time: str


class ChartDataResponse(BaseModel):
    day: str
    hours: float  # We are mapping action counts to "hours" property so we don't break frontend prop names if possible, but the plan said "actions". Wait, let's just use the same prop name "hours" but pass the action count, or change the frontend. Let's use "count" and update frontend.
    count: int


class AnalyticsResponse(BaseModel):
    metrics: list[MetricResponse]
    recent_activity: list[ActivityItemResponse]
    chart_data: list[ChartDataResponse]
    period: str
    feature_distribution: dict[str, int]


def _format_time_ago(dt: datetime) -> str:
    now = datetime.now(dt.tzinfo) if dt.tzinfo else datetime.now()
    diff = now - dt
    if diff.days > 7:
        return dt.strftime("%b %d, %Y")
    if diff.days > 0:
        return f"{diff.days}d ago"
    hours = diff.seconds // 3600
    if hours > 0:
        return f"{hours}h ago"
    minutes = (diff.seconds % 3600) // 60
    if minutes > 0:
        return f"{minutes}m ago"
    return "Just now"


@router.get("", response_model=AnalyticsResponse)
async def get_analytics(
    user: User = Depends(get_current_user_entity),
    session: AsyncSession = Depends(get_db_session),
) -> AnalyticsResponse:
    now = datetime.now()
    week_start = now - timedelta(days=7)

    from app.models.study_session import StudySession

    # 1. Base Metrics
    doc_count_stmt = select(func.count(Document.id)).where(
        Document.owner_id == user.id, Document.is_deleted.is_(False)
    )
    ready_stmt = select(func.count(Document.id)).where(
        Document.owner_id == user.id,
        Document.status == DocumentStatus.ready.value,
        Document.is_deleted.is_(False),
    )

    INCLUDED_FEATURES = ["chat", "search", "flashcards", "quiz", "quiz_started", "quiz_generated", "quiz_completed", "notes", "document_reading"]

    # Lifetime stats for top metrics & score
    stats_stmt = select(
        StudySession.feature_used, 
        func.count(StudySession.id).label("count"),
        func.coalesce(func.sum(StudySession.duration_seconds), 0).label("duration")
    ).where(
        StudySession.user_id == user.id, 
        StudySession.is_deleted.is_(False),
        StudySession.feature_used.in_(INCLUDED_FEATURES)
    ).group_by(StudySession.feature_used)
    
    # Weekly stats for feature_distribution
    weekly_stats_stmt = select(
        StudySession.feature_used, 
        func.count(StudySession.id).label("count")
    ).where(
        StudySession.user_id == user.id, 
        StudySession.is_deleted.is_(False),
        StudySession.started_at >= week_start,
        StudySession.feature_used.in_(INCLUDED_FEATURES)
    ).group_by(StudySession.feature_used)
    
    # Run base metrics and stats concurrently
    doc_total_task = await session.execute(doc_count_stmt)
    ready_total_task = await session.execute(ready_stmt)
    stats_results_task = await session.execute(stats_stmt)
    weekly_stats_task = await session.execute(weekly_stats_stmt)

    doc_total = doc_total_task.scalar_one_or_none() or 0
    ready_total = ready_total_task.scalar_one_or_none() or 0
    stats_results = stats_results_task
    weekly_stats_results = weekly_stats_task
    
    total_seconds = 0
    flashcards_count = 0
    quizzes_count = 0
    
    feature_distribution = {
        "Chat": 0,
        "Search": 0,
        "Flashcards": 0,
        "Quiz": 0,
        "Notes": 0,
        "Reading": 0,
    }
    
    # Process Lifetime Stats for score and top metrics
    for row in stats_results.all():
        total_seconds += row.duration
        feat = row.feature_used
        count = row.count
        
        if feat == "flashcards":
            flashcards_count += count
        elif feat in ("quiz", "quiz_completed"):
            quizzes_count += count

    total_minutes = total_seconds // 60

    # Process Weekly Stats for the feature_distribution
    for row in weekly_stats_results.all():
        feat = row.feature_used
        count = row.count
        
        if feat == "chat":
            feature_distribution["Chat"] += count
        elif feat == "search":
            feature_distribution["Search"] += count
        elif feat == "flashcards":
            feature_distribution["Flashcards"] += count
        elif feat in ("quiz", "quiz_started", "quiz_generated", "quiz_completed"):
            feature_distribution["Quiz"] += count
        elif feat == "notes":
            feature_distribution["Notes"] += count
        elif feat == "document_reading":
            feature_distribution["Reading"] += count

    chat_count_stmt = select(func.count(ChatSession.id)).where(ChatSession.owner_id == user.id)
    note_count_stmt = select(func.count(Note.id)).where(Note.user_id == user.id)
    
    chats_task = await session.execute(chat_count_stmt)
    notes_task = await session.execute(note_count_stmt)
    
    chats_count = chats_task.scalar_one_or_none() or 0
    notes_count = notes_task.scalar_one_or_none() or 0
            
    score = (total_minutes * 1) + (chats_count * 2) + (flashcards_count * 3) + (quizzes_count * 5) + (notes_count * 4)
    score_breakdown = {
        "Study Time (1 pt/min)": total_minutes * 1,
        "Chats (2 pts/ea)": chats_count * 2,
        "Flashcards (3 pts/ea)": flashcards_count * 3,
        "Quizzes (5 pts/ea)": quizzes_count * 5,
        "Notes (4 pts/ea)": notes_count * 4,
    }

    metrics = [
        MetricResponse(label="Papers", value=doc_total, change="Total", icon="FileText", color="#3b82f6"),
        MetricResponse(label="Processed", value=ready_total, change="Ready", icon="CheckCircle", color="#10b981"),
        MetricResponse(label="Chats", value=chats_count, change="Total Sessions", icon="MessageSquare", color="#ec4899"),
        MetricResponse(label="Study Time", value=f"{total_minutes}m", change="Total", icon="Clock", color="#8b5cf6"),
        MetricResponse(label="Score", value=score, change="Points", icon="BarChart", color="#f59e0b", breakdown=score_breakdown),
    ]

    # 2. Recent Activity
    docs_stmt = select(Document).where(
        Document.owner_id == user.id, Document.is_deleted.is_(False)
    ).order_by(Document.created_at.desc()).limit(5)
    
    sessions_stmt = select(StudySession).where(
        StudySession.user_id == user.id, StudySession.is_deleted.is_(False)
    ).order_by(StudySession.created_at.desc()).limit(5)

    recent_docs_task = await session.execute(docs_stmt)
    recent_sessions_task = await session.execute(sessions_stmt)

    recent_docs = recent_docs_task.scalars().all()
    recent_sessions = recent_sessions_task.scalars().all()

    activities = []
    for d in recent_docs:
        activities.append({
            "id": str(d.id),
            "type": "upload",
            "title": d.title or "Untitled Document",
            "description": "Uploaded a document",
            "time": _format_time_ago(d.created_at),
            "created_at": d.created_at
        })
    
    for s in recent_sessions:
        if s.feature_used == "chat":
            title, desc = "Started AI Chat", "Engaged with the study assistant"
            type_str = "chat"
        elif s.feature_used == "flashcards":
            title, desc = "Generated Flashcards", "Created study flashcards"
            type_str = "flashcard"
        elif s.feature_used == "quiz_generated":
            title, desc = "Generated Quiz", "AI automatically generated a quiz"
            type_str = "quiz"
        elif s.feature_used == "quiz_started":
            title, desc = "Started Quiz", "Began taking a quiz"
            type_str = "quiz"
        elif s.feature_used in ("quiz", "quiz_completed"):
            title, desc = "Completed Quiz", "Tested knowledge"
            type_str = "quiz"
        elif s.feature_used == "notes":
            title, desc = "Created Notes", "Jotted down study notes"
            type_str = "summary"
        elif s.feature_used == "search":
            title, desc = "Performed Search", "Searched through documents"
            type_str = "search"
        elif s.feature_used == "document_reading":
            title, desc = "Read Document", "Studied a document"
            type_str = "search"
        else:
            continue
            
        activities.append({
            "id": str(s.id),
            "type": type_str,
            "title": title,
            "description": desc,
            "time": _format_time_ago(s.created_at),
            "created_at": s.created_at
        })

    activities.sort(key=lambda x: x["created_at"], reverse=True)
    activities = activities[:5]

    activity_items = [
        ActivityItemResponse(
            id=a["id"],
            type=a["type"],
            title=a["title"],
            description=a["description"],
            time=a["time"]
        ) for a in activities
    ]

    # 3. Chart Data (Study Time per day over last 7 days)
    chart_stmt = select(
        cast(StudySession.started_at, Date).label("day"),
        func.coalesce(func.sum(StudySession.duration_seconds), 0).label("duration")
    ).where(
        StudySession.user_id == user.id,
        StudySession.is_deleted.is_(False),
        StudySession.started_at >= week_start,
        StudySession.feature_used.in_(INCLUDED_FEATURES)
    ).group_by(
        cast(StudySession.started_at, Date)
    ).order_by("day")
    
    chart_results = (await session.execute(chart_stmt)).all()
    
    chart_data = []
    results_dict = {r.day: r.duration for r in chart_results}
    
    for i in range(7):
        d = (now - timedelta(days=6-i)).date()
        duration_seconds = results_dict.get(d, 0)
        minutes = duration_seconds // 60
        chart_data.append(ChartDataResponse(
            day=d.strftime("%a"),
            hours=minutes,
            count=minutes
        ))

    return AnalyticsResponse(
        metrics=metrics,
        recent_activity=activity_items,
        chart_data=chart_data,
        period="Last 7 days",
        feature_distribution=feature_distribution
    )

from app.schemas.analytics import AnalyticsSummaryResponse
from app.repositories.analytics import AnalyticsRepository
from app.services.analytics import AnalyticsService

@router.get("/summary", response_model=AnalyticsSummaryResponse)
async def get_analytics_summary(
    user: User = Depends(get_current_user_entity),
    session: AsyncSession = Depends(get_db_session),
) -> AnalyticsSummaryResponse:
    repository = AnalyticsRepository(session)
    service = AnalyticsService(repository)
    return await service.get_summary(user.id)

from fastapi import Query
from app.schemas.analytics import TimelineDataResponse

@router.get("/timeline", response_model=list[TimelineDataResponse])
async def get_analytics_timeline(
    period: str = Query("weekly", regex="^(weekly|monthly)$"),
    user: User = Depends(get_current_user_entity),
    session: AsyncSession = Depends(get_db_session),
) -> list[TimelineDataResponse]:
    repository = AnalyticsRepository(session)
    service = AnalyticsService(repository)
    return await service.get_timeline(user.id, period)

from app.schemas.analytics import TopPaperResponse

@router.get("/top-papers", response_model=list[TopPaperResponse])
async def get_analytics_top_papers(
    user: User = Depends(get_current_user_entity),
    session: AsyncSession = Depends(get_db_session),
) -> list[TopPaperResponse]:
    repository = AnalyticsRepository(session)
    service = AnalyticsService(repository)
    return await service.get_top_papers(user.id)

from app.schemas.analytics import StreakAnalyticsResponse

@router.get("/streaks", response_model=StreakAnalyticsResponse)
async def get_analytics_streaks(
    user: User = Depends(get_current_user_entity),
    session: AsyncSession = Depends(get_db_session),
) -> StreakAnalyticsResponse:
    repository = AnalyticsRepository(session)
    service = AnalyticsService(repository)
    data = await service.get_streaks(user.id)
    return StreakAnalyticsResponse(**data)
