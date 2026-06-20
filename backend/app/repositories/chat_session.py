"""Chat session repository."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chat_session import ChatSession, ChatSessionStatus


class ChatSessionRepository:
    """Data access for chat sessions."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, session: ChatSession, owner_id: UUID) -> ChatSession:
        """Create a new chat session."""
        session.owner_id = owner_id
        self._session.add(session)
        await self._session.flush()
        await self._session.refresh(session)
        return session

    async def get_by_id(self, session_id: UUID, owner_id: UUID) -> ChatSession | None:
        """Fetch a chat session by id for an owner."""
        result = await self._session.execute(
            select(ChatSession).where(
                ChatSession.id == session_id,
                ChatSession.owner_id == owner_id,
            )
        )
        return result.scalar_one_or_none()

    async def list_by_owner(self, owner_id: UUID) -> list[ChatSession]:
        """List all active chat sessions for an owner."""
        result = await self._session.execute(
            select(ChatSession)
            .where(ChatSession.owner_id == owner_id, ChatSession.status == ChatSessionStatus.active.value)
            .order_by(ChatSession.updated_at.desc())
        )
        return list(result.scalars().all())

    async def update(self, session: ChatSession, title: str | None = None, selected_document_ids: list[str] | None = None) -> ChatSession:
        """Update a chat session."""
        if title is not None:
            session.title = title
        if selected_document_ids is not None:
            session.selected_document_ids = selected_document_ids
        await self._session.flush()
        await self._session.refresh(session)
        return session

    async def archive(self, session: ChatSession) -> ChatSession:
        """Archive a chat session."""
        session.status = ChatSessionStatus.archived.value
        await self._session.flush()
        await self._session.refresh(session)
        return session
