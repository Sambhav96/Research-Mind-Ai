"""Chat message model."""

from __future__ import annotations

from enum import Enum
from uuid import UUID

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class MessageRole(str, Enum):
    """Chat message author role."""

    user = "user"
    assistant = "assistant"
    system = "system"


class ChatMessage(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Persisted chat message with citation references."""

    __tablename__ = "chat_messages"

    session_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("chat_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role: Mapped[str] = mapped_column(String(16), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    citations: Mapped[list[str] | None] = mapped_column(
        Text, nullable=True, comment="JSON-serialized citation references."
    )
