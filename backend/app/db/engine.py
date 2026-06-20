"""Async SQLAlchemy engine configuration."""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine

from app.core.config import Settings, get_settings


_engine: AsyncEngine | None = None


def build_engine(settings: Settings) -> AsyncEngine:
    """Build a new async SQLAlchemy engine with pooling configured."""
    return create_async_engine(
        settings.database_url,
        echo=settings.db_echo,
        pool_size=settings.db_pool_size,
        max_overflow=settings.db_max_overflow,
        pool_timeout=settings.db_pool_timeout,
        pool_recycle=settings.db_pool_recycle,
        pool_pre_ping=True,
    )


def get_engine() -> AsyncEngine:
    """Create or return the singleton async engine."""
    global _engine
    if _engine is None:
        settings = get_settings()
        _engine = build_engine(settings)
    return _engine
