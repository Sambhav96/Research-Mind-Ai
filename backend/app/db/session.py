"""Async SQLAlchemy session management."""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from tenacity import AsyncRetrying, stop_after_attempt, wait_exponential

from app.core.config import get_settings
from app.core.logging import setup_logging
from app.db.engine import get_engine


_session_factory: async_sessionmaker[AsyncSession] | None = None
_connection_verified: bool = False


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    """Create or return the async session factory."""
    global _session_factory
    if _session_factory is None:
        _session_factory = async_sessionmaker(bind=get_engine(), expire_on_commit=False)
    return _session_factory


async def verify_database_connection() -> None:
    """Verify database connectivity with retry handling."""
    global _connection_verified
    if _connection_verified:
        return

    settings = get_settings()
    setup_logging(settings)

    retrying = AsyncRetrying(
        stop=stop_after_attempt(settings.db_connection_retry_attempts),
        wait=wait_exponential(
            min=settings.db_connection_retry_min_seconds,
            max=settings.db_connection_retry_max_seconds,
        ),
        reraise=True,
    )

    async for attempt in retrying:
        with attempt:
            async with get_engine().connect() as connection:
                await connection.execute(text("SELECT 1"))
    _connection_verified = True


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency for an async DB session."""
    await verify_database_connection()
    session_factory = get_session_factory()
    async with session_factory() as session:
        yield session


@asynccontextmanager
async def transactional_session() -> AsyncGenerator[AsyncSession, None]:
    """Async transactional session with commit/rollback handling."""
    await verify_database_connection()
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            async with session.begin():
                yield session
        except Exception:
            await session.rollback()
            raise
