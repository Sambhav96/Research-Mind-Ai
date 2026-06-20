"""Study session schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel


class StudySessionCreate(BaseModel):
    """Create a new study session."""

    feature_used: Literal["chat", "search", "flashcards", "quiz", "quiz_generated", "quiz_started", "quiz_completed", "notes", "document_reading"] = "chat"


class StudySessionUpdate(BaseModel):
    """Update an existing study session."""

    ended_at: datetime | None = None
    duration_seconds: int = 0


class StudySessionResponse(BaseModel):
    """Study session response."""

    id: UUID
    user_id: UUID
    feature_used: str
    started_at: datetime
    ended_at: datetime | None
    duration_seconds: int
    created_at: datetime
    updated_at: datetime


class StudyStatsResponse(BaseModel):
    """Study statistics response."""

    today_seconds: int
    week_seconds: int
    month_seconds: int
    daily_breakdown: list[dict[str, int | str]]
    feature_breakdown: dict[str, int]
    weekly_feature_counts: dict[str, int] = {}
