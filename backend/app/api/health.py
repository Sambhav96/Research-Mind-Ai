"""Health check endpoint."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter

from app.core.config import get_settings

router = APIRouter()


@router.get("/health", tags=["health"])
async def health_check() -> dict[str, str]:
    """Return application health status."""
    settings = get_settings()
    return {
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "environment": settings.environment,
        "version": settings.app_version,
    }
