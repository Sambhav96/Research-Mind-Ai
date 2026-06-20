"""Admin DevOps Monitoring routes."""

from __future__ import annotations

import random
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.models.admin import Admin
from app.models.error_log import ErrorLog
from app.services.admin_auth import get_current_admin_entity

router = APIRouter(prefix="/admin/devops", tags=["admin_devops"])

# --- Schemas ---

class HealthStatusResponse(BaseModel):
    frontend: str
    backend: str
    database: str
    storage: str

class ErrorLogResponse(BaseModel):
    id: str
    timestamp: str
    module: str
    message: str
    severity: str

# --- Endpoints ---

@router.get("/health", response_model=HealthStatusResponse)
async def get_health_status(
    admin: Admin = Depends(get_current_admin_entity),
    session: AsyncSession = Depends(get_db_session)
) -> HealthStatusResponse:
    """Check health of system components."""
    # Database check
    try:
        await session.execute(text("SELECT 1"))
        db_status = "Operational"
    except Exception:
        db_status = "Degraded"

    return HealthStatusResponse(
        frontend="Operational",
        backend="Operational",
        database=db_status,
        storage="Operational"
    )

@router.get("/logs", response_model=list[ErrorLogResponse])
async def get_error_logs(
    severity: Optional[str] = Query(None, description="Filter by severity: Info, Warning, Critical"),
    admin: Admin = Depends(get_current_admin_entity),
    session: AsyncSession = Depends(get_db_session)
) -> list[ErrorLogResponse]:
    """Fetch error logs from the database."""
    stmt = select(ErrorLog).order_by(ErrorLog.created_at.desc()).limit(100)
    
    if severity and severity != "All":
        stmt = stmt.where(ErrorLog.severity == severity)
        
    result = await session.execute(stmt)
    logs = result.scalars().all()
    
    return [
        ErrorLogResponse(
            id=str(log.id),
            timestamp=log.created_at.isoformat(),
            module=log.module,
            message=log.message,
            severity=log.severity
        ) for log in logs
    ]

@router.post("/logs/seed")
async def seed_error_logs(
    admin: Admin = Depends(get_current_admin_entity),
    session: AsyncSession = Depends(get_db_session)
) -> dict[str, str]:
    """Generate dummy logs for testing."""
    modules = ["Authentication", "Document Processing", "AI Chat Service", "Billing Webhook", "Database Sync", "Storage Upload"]
    messages_info = ["Cache cleared successfully", "User session expired", "Background task completed"]
    messages_warning = ["High latency detected", "API rate limit approaching", "Memory usage spiked to 80%"]
    messages_critical = ["Database connection lost", "Payment gateway timeout", "Failed to encrypt payload", "Unhandled exception in worker"]
    
    for _ in range(15):
        sev_rand = random.random()
        if sev_rand < 0.6:
            sev = "Info"
            msg = random.choice(messages_info)
        elif sev_rand < 0.9:
            sev = "Warning"
            msg = random.choice(messages_warning)
        else:
            sev = "Critical"
            msg = random.choice(messages_critical)
            
        log = ErrorLog(
            module=random.choice(modules),
            message=msg,
            severity=sev
        )
        session.add(log)
        
    await session.commit()
    return {"status": "ok", "message": "Dummy logs seeded"}
