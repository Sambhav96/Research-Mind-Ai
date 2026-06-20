from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone

from app.db.session import get_db_session
from app.models.ai_log import AILog
from app.models.admin import Admin
from app.services.admin_auth import get_current_admin_entity

router = APIRouter(prefix="/admin/ai-monitoring", tags=["admin_ai_monitoring"])

class AIAggregationsResponse(BaseModel):
    total_requests: int
    success_rate: float
    avg_latency_ms: float
    total_tokens: int
    total_cost: float

class AILogResponse(BaseModel):
    id: str
    user_id: Optional[str]
    provider: str
    model: str
    prompt: Optional[str]
    response: Optional[str]
    latency_ms: int
    status: str
    error_message: Optional[str]
    tokens_used: int
    cost: float
    created_at: str

class AILogListResponse(BaseModel):
    logs: list[AILogResponse]
    total: int
    page: int
    size: int

@router.get("/aggregations", response_model=AIAggregationsResponse)
async def get_ai_aggregations(
    time_range: str = "7d",
    admin: Admin = Depends(get_current_admin_entity),
    session: AsyncSession = Depends(get_db_session)
):
    now = datetime.now(timezone.utc)
    delta = timedelta(days=7)
    if time_range == "24h":
        delta = timedelta(days=1)
    elif time_range == "30d":
        delta = timedelta(days=30)
    
    since = now - delta
    
    stmt = select(
        func.count(AILog.id),
        func.avg(AILog.latency_ms),
        func.sum(AILog.tokens_used),
        func.sum(AILog.cost)
    ).where(AILog.created_at >= since)
    
    result = await session.execute(stmt)
    row = result.first()
    
    total_req = row[0] or 0
    avg_lat = float(row[1] or 0.0)
    tot_tok = row[2] or 0
    tot_cost = float(row[3] or 0.0)
    
    succ_stmt = select(func.count(AILog.id)).where(AILog.created_at >= since, AILog.status == "success")
    succ_res = await session.execute(succ_stmt)
    succ_req = succ_res.scalar() or 0
    
    success_rate = (succ_req / total_req * 100) if total_req > 0 else 100.0
    
    return AIAggregationsResponse(
        total_requests=total_req,
        success_rate=success_rate,
        avg_latency_ms=avg_lat,
        total_tokens=tot_tok,
        total_cost=tot_cost
    )

@router.get("/logs", response_model=AILogListResponse)
async def list_ai_logs(
    page: int = 1,
    size: int = 20,
    status: Optional[str] = None,
    model: Optional[str] = None,
    admin: Admin = Depends(get_current_admin_entity),
    session: AsyncSession = Depends(get_db_session)
):
    stmt = select(AILog)
    if status and status.lower() != "all":
        stmt = stmt.where(AILog.status == status.lower())
    if model and model.lower() != "all":
        stmt = stmt.where(AILog.model == model)
        
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = await session.scalar(count_stmt) or 0
    
    stmt = stmt.order_by(desc(AILog.created_at)).offset((page - 1) * size).limit(size)
    result = await session.execute(stmt)
    logs = result.scalars().all()
    
    out = []
    for l in logs:
        out.append(AILogResponse(
            id=str(l.id),
            user_id=str(l.user_id) if l.user_id else None,
            provider=l.provider,
            model=l.model,
            prompt=l.prompt,
            response=l.response,
            latency_ms=l.latency_ms,
            status=l.status,
            error_message=l.error_message,
            tokens_used=l.tokens_used,
            cost=l.cost,
            created_at=l.created_at.isoformat()
        ))
        
    return AILogListResponse(
        logs=out,
        total=total,
        page=page,
        size=size
    )
