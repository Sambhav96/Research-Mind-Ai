"""Service for AI monitoring logs."""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import select, func, desc, true, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import transactional_session
from app.models.ai_log import AILog


class AdminAILogsService:
    """Service for logging and querying AI usage metrics."""

    @staticmethod
    def log_ai_request_background(
        user_id: str | None,
        provider: str,
        model: str,
        prompt: str,
        response: str | None,
        latency_ms: int,
        status: str,
        error_message: str | None = None,
    ):
        """Spawns a background task to record the AI log."""

        async def _record_log():
            try:
                async with transactional_session() as session:
                    log_entry = AILog(
                        user_id=user_id,
                        provider=provider,
                        model=model,
                        prompt=prompt,
                        response=response,
                        latency_ms=latency_ms,
                        status=status,
                        error_message=error_message,
                    )
                    session.add(log_entry)
            except Exception as e:
                import logging
                logging.getLogger("scholarmind.admin_ai_logs").error(f"Failed to save AI log: {e}")

        asyncio.create_task(_record_log())

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_metrics(self) -> dict[str, Any]:
        """Calculate overall AI usage metrics."""
        total_requests = await self._session.scalar(select(func.count(AILog.id))) or 0
        
        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        daily_requests = await self._session.scalar(
            select(func.count(AILog.id)).where(AILog.created_at >= today_start)
        ) or 0
        
        avg_latency = await self._session.scalar(
            select(func.avg(AILog.latency_ms))
        ) or 0.0
        
        failed_requests = await self._session.scalar(
            select(func.count(AILog.id)).where(AILog.status == "error")
        ) or 0

        # Provider breakdown
        providers_stmt = select(
            AILog.provider,
            func.count(AILog.id).label("total"),
            func.avg(AILog.latency_ms).label("avg_latency"),
            func.sum(case((AILog.status == "error", 1), else_=0)).label("errors")
        ).group_by(AILog.provider)
        
        result = await self._session.execute(providers_stmt)
        provider_stats = []
        for row in result:
            provider = row[0]
            total = row[1]
            avg_lat = int(row[2]) if row[2] else 0
            errs = int(row[3]) if row[3] else 0
            success_rate = ((total - errs) / total * 100) if total > 0 else 0.0
            error_rate = (errs / total * 100) if total > 0 else 0.0
            provider_stats.append({
                "provider": provider,
                "success_rate": success_rate,
                "error_rate": error_rate,
                "avg_latency": avg_lat,
            })

        return {
            "total_requests": total_requests,
            "daily_requests": daily_requests,
            "avg_latency": int(avg_latency),
            "failed_requests": failed_requests,
            "provider_stats": provider_stats,
        }

    async def get_logs(self, limit: int = 50, offset: int = 0) -> list[dict[str, Any]]:
        """Retrieve paginated logs."""
        stmt = select(AILog).order_by(desc(AILog.created_at)).limit(limit).offset(offset)
        result = await self._session.execute(stmt)
        logs = result.scalars().all()
        
        return [
            {
                "id": str(log.id),
                "prompt": log.prompt,
                "timestamp": log.created_at.isoformat(),
                "model": log.model,
                "provider": log.provider,
                "status": log.status,
            }
            for log in logs
        ]

    async def get_charts(self, days: int = 30) -> dict[str, Any]:
        """Retrieve usage charts."""
        cutoff = datetime.utcnow() - timedelta(days=days)
        
        # We group by date
        stmt = select(
            func.date(AILog.created_at).label("day"),
            func.count(AILog.id).label("count")
        ).where(AILog.created_at >= cutoff).group_by(func.date(AILog.created_at)).order_by(func.date(AILog.created_at))
        
        result = await self._session.execute(stmt)
        daily_usage = [{"date": str(row[0]), "requests": row[1]} for row in result]
        
        return {
            "daily_usage": daily_usage,
            "weekly_usage": [],  # Can aggregate daily to weekly if needed
            "monthly_usage": []  # Can aggregate daily to monthly if needed
        }
