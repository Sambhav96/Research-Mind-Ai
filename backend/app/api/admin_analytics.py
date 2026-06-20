"""Admin Analytics routes."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func, select, cast, Date
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.models.admin import Admin
from app.models.user import User
from app.models.document import Document
from app.models.ai_log import AILog
from app.services.admin_auth import get_current_admin_entity

router = APIRouter(prefix="/admin/analytics", tags=["admin_analytics"])

class TimeSeriesPoint(BaseModel):
    date: str
    value: int

class AdminAnalyticsResponse(BaseModel):
    new_users: List[TimeSeriesPoint]
    document_uploads: List[TimeSeriesPoint]
    ai_requests: List[TimeSeriesPoint]

@router.get("", response_model=AdminAnalyticsResponse)
async def get_admin_analytics(
    days: int = Query(30, description="Number of days to look back"),
    admin: Admin = Depends(get_current_admin_entity),
    session: AsyncSession = Depends(get_db_session)
) -> AdminAnalyticsResponse:
    """Get platform-wide time-series analytics."""
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)

    # 1. New Users
    users_stmt = select(
        cast(User.created_at, Date).label("day"),
        func.count(User.id).label("count")
    ).where(
        User.created_at >= start_date
    ).group_by(cast(User.created_at, Date)).order_by("day")
    
    users_result = await session.execute(users_stmt)
    users_dict = {r.day: r.count for r in users_result.all()}

    # 2. Document Uploads
    docs_stmt = select(
        cast(Document.created_at, Date).label("day"),
        func.count(Document.id).label("count")
    ).where(
        Document.created_at >= start_date
    ).group_by(cast(Document.created_at, Date)).order_by("day")
    
    docs_result = await session.execute(docs_stmt)
    docs_dict = {r.day: r.count for r in docs_result.all()}

    # 3. AI Requests
    ai_stmt = select(
        cast(AILog.created_at, Date).label("day"),
        func.count(AILog.id).label("count")
    ).where(
        AILog.created_at >= start_date
    ).group_by(cast(AILog.created_at, Date)).order_by("day")
    
    ai_result = await session.execute(ai_stmt)
    ai_dict = {r.day: r.count for r in ai_result.all()}

    # Fill in zeros for missing days
    users_ts = []
    docs_ts = []
    ai_ts = []
    
    for i in range(days + 1):
        d = (start_date + timedelta(days=i)).date()
        users_ts.append(TimeSeriesPoint(date=d.isoformat(), value=users_dict.get(d, 0)))
        docs_ts.append(TimeSeriesPoint(date=d.isoformat(), value=docs_dict.get(d, 0)))
        ai_ts.append(TimeSeriesPoint(date=d.isoformat(), value=ai_dict.get(d, 0)))

    return AdminAnalyticsResponse(
        new_users=users_ts,
        document_uploads=docs_ts,
        ai_requests=ai_ts
    )
