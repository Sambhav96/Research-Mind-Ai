"""Study session model."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.mixins import SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin


class FeatureType(str, Enum):
    """Feature being used during study session."""

    CHAT = "chat"
    SEARCH = "search"
    FLASHCARDS = "flashcards"
    QUIZ = "quiz"
    QUIZ_GENERATED = "quiz_generated"
    QUIZ_STARTED = "quiz_started"
    QUIZ_COMPLETED = "quiz_completed"
    NOTES = "notes"
    DOCUMENT_READING = "document_reading"


class StudySession(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    """Study session ORM model."""

    __tablename__ = "study_sessions"

    user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    feature_used: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_seconds: Mapped[int] = mapped_column(nullable=False, default=0)
