"""Chat session model."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from uuid import UUID

from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID as PGUUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class ChatSessionStatus(str, Enum):
    """Chat session lifecycle states."""

    active = "active"
    archived = "archived"


class ChatSession(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Chat session model for multi-turn RAG conversations."""

    __tablename__ = "chat_sessions"

    owner_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(256), nullable=False, default="New Chat")
    status: Mapped[str] = mapped_column(
        String(16), nullable=False, default=ChatSessionStatus.active.value
    )
    selected_document_ids: Mapped[list | None] = mapped_column(JSONB, nullable=True)
