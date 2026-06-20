"""Chat message repository."""

from __future__ import annotations

import json
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chat_message import ChatMessage, MessageRole
from app.models.chat_session import ChatSession


class ChatMessageRepository:
    """Data access for chat messages."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, message: ChatMessage) -> ChatMessage:
        """Persist a chat message."""
        self._session.add(message)
        await self._session.flush()
        return message

    async def create_many(self, messages: list[ChatMessage]) -> list[ChatMessage]:
        """Persist multiple chat messages in a single transaction."""
        self._session.add_all(messages)
        await self._session.flush()
        return messages

    async def get_by_session_id(
        self, session_id: UUID, owner_id: UUID, limit: int = 50, offset: int = 0
    ) -> list[ChatMessage]:
        """Fetch messages for a session ordered by created_at, verifying session ownership."""
        result = await self._session.execute(
            select(ChatMessage)
            .join(ChatSession, ChatMessage.session_id == ChatSession.id)
            .where(
                ChatMessage.session_id == session_id,
                ChatSession.owner_id == owner_id,
            )
            .order_by(ChatMessage.created_at.asc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())

    async def get_recent(
        self, session_id: UUID, owner_id: UUID, limit: int = 10
    ) -> list[ChatMessage]:
        """Fetch the most recent messages for a session, verifying session ownership."""
        result = await self._session.execute(
            select(ChatMessage)
            .join(ChatSession, ChatMessage.session_id == ChatSession.id)
            .where(
                ChatMessage.session_id == session_id,
                ChatSession.owner_id == owner_id,
            )
            .order_by(ChatMessage.created_at.desc())
            .limit(limit)
        )
        rows = list(result.scalars().all())
        return list(reversed(rows))
