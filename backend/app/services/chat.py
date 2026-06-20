"""Chat service for multi-turn RAG conversations."""

from __future__ import annotations

import json
import logging
from datetime import datetime
from typing import AsyncGenerator

from sqlalchemy import func, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.errors import AppError
from app.models.chat_message import MessageRole, ChatMessage
from app.models.chat_session import ChatSession, ChatSessionStatus
from app.repositories.chat_message import ChatMessageRepository
from app.repositories.chat_session import ChatSessionRepository
from app.schemas.chat import ChatMessageResponse, ChatResponse, ChatSessionResponse
from app.services.ai.provider import get_generation_provider
from app.services.rag import RAGService


class ChatService:
    """High-level chat orchestration with session and message lifecycle."""

    def __init__(self, session: AsyncSession, settings=None) -> None:
        self._settings = settings or get_settings()
        self._session = session
        self._session_repo = ChatSessionRepository(session)
        self._message_repo = ChatMessageRepository(session)
        self._rag_svc = RAGService(session)
        self._logger = logging.getLogger("scholarmind.chat")


    async def create_session(self, owner_id, title: str = "New Chat") -> ChatSessionResponse:
        """Create a new chat session."""
        cs = ChatSession(title=title, owner_id=owner_id, status=ChatSessionStatus.active.value)
        cs = await self._session_repo.create(cs, owner_id)
        await self._session.commit()
        resp = ChatSessionResponse(
            id=str(cs.id),
            title=cs.title,
            status=cs.status,
            created_at=cs.created_at.isoformat() if cs.created_at else "",
            updated_at=cs.updated_at.isoformat() if cs.updated_at else "",
            selected_document_ids=cs.selected_document_ids,
        )
        self._logger.info("Created chat session", extra={"session_id": str(cs.id), "owner_id": str(owner_id)})
        return resp

    async def list_sessions(self, owner_id) -> list[ChatSessionResponse]:
        """List active chat sessions for the owner."""
        sessions = await self._session_repo.list_by_owner(owner_id)
        return [
            ChatSessionResponse(
                id=str(s.id),
                title=s.title,
                status=s.status,
                created_at=s.created_at.isoformat(),
                updated_at=s.updated_at.isoformat(),
                selected_document_ids=s.selected_document_ids,
            )
            for s in sessions
        ]

    async def get_session(self, session_id, owner_id) -> ChatSessionResponse | None:
        """Get a specific chat session."""
        s = await self._session_repo.get_by_id(session_id, owner_id)
        if not s:
            return None
        return ChatSessionResponse(
            id=str(s.id),
            title=s.title,
            status=s.status,
            created_at=s.created_at.isoformat(),
            updated_at=s.updated_at.isoformat(),
            selected_document_ids=s.selected_document_ids,
        )

    async def archive_session(self, session_id, owner_id) -> ChatSessionResponse:
        """Archive a chat session."""
        s = await self._session_repo.get_by_id(session_id, owner_id)
        if not s:
            raise AppError(code="session_not_found", message="Chat session not found", status_code=404)
        s = await self._session_repo.archive(s)
        resp = ChatSessionResponse(
            id=str(s.id),
            title=s.title,
            status=s.status,
            created_at=s.created_at.isoformat(),
            updated_at=s.updated_at.isoformat(),
            selected_document_ids=s.selected_document_ids,
        )
        await self._session.commit()
        return resp

    async def update_session(self, session_id, owner_id, title: str | None = None, selected_document_ids: list[str] | None = None) -> ChatSessionResponse:
        """Update a chat session."""
        s = await self._session_repo.get_by_id(session_id, owner_id)
        if not s:
            raise AppError(code="session_not_found", message="Chat session not found", status_code=404)
        s = await self._session_repo.update(s, title=title, selected_document_ids=selected_document_ids)
        resp = ChatSessionResponse(
            id=str(s.id),
            title=s.title,
            status=s.status,
            created_at=s.created_at.isoformat(),
            updated_at=s.updated_at.isoformat(),
            selected_document_ids=s.selected_document_ids,
        )
        await self._session.commit()
        return resp

    async def get_history(self, session_id, owner_id, limit: int = 50) -> list[ChatMessageResponse]:
        """Get message history for a session."""
        messages = await self._message_repo.get_by_session_id(session_id, owner_id, limit=limit)
        return [self._to_message_response(m) for m in messages]

    async def chat(
        self,
        owner_id,
        query: str,
        session_id: str | None = None,
        document_ids: list[str] | None = None,
        stream: bool = False,
    ) -> ChatResponse | AsyncGenerator[str, None]:
        """Main RAG chat method.

        Orchestrates retrieval, context assembly, LLM generation, and persistence.
        """
        current_session = await self._resolve_session(owner_id, session_id, query)

        chunks, citations, sources = await self._rag_svc.retrieve(
            query=query,
            owner_id=str(owner_id),
            document_ids=document_ids,
        )

        doc_names = []
        if document_ids:
            from app.repositories.document import DocumentRepository
            import uuid
            doc_repo = DocumentRepository(self._session)
            for did in document_ids:
                try:
                    d = await doc_repo.get_by_id(uuid.UUID(did))
                    if d:
                        doc_names.append(d.title or d.filename)
                except Exception:
                    pass
        else:
            doc_names = ["All Documents"]

        log_msg = (
            f"\n{'='*40}\n"
            f"Session ID: {current_session.id}\n"
            f"Selected Document IDs: {document_ids}\n"
            f"Selected Document Names: {doc_names}\n"
            f"{'='*40}"
        )
        self._logger.info(log_msg)

        history = await self._get_history_for_prompt(current_session.id, owner_id)

        context = self._rag_svc.build_context(chunks)
        
        unique_docs = len(set(s.document_id for s in sources))
        messages = self._rag_svc.build_prompt(
            query=query, 
            context=context, 
            history=history,
            source_document_count=unique_docs
        )

        if stream:
            return self._stream_and_persist(current_session.id, messages, citations, sources)

        answer = await self._rag_svc.generate_answer(messages, stream=False)

        await self._persist_exchange(current_session.id, query, answer, citations)

        return ChatResponse(
            answer=answer, 
            session_id=str(current_session.id),
            citations=citations, 
            sources=sources
        )

    async def _resolve_session(self, owner_id, session_id: str | None, query: str | None = None):
        """Resolve or create a chat session."""
        if session_id:
            s = await self._session_repo.get_by_id(session_id, owner_id)
            if not s:
                raise AppError(code="session_not_found", message="Chat session not found", status_code=404)
            return s
        
        # Auto-name the session based on the first query
        title = "New Chat"
        if query:
            try:
                provider = get_generation_provider()
                prompt = f"Generate a short, concise 2-4 word title for this chat based on the user's first message. Do not use quotes or punctuation. Return ONLY the title. User message: {query}"
                result = await provider.generate(prompt, temperature=0.7, max_tokens=100)
                generated_title = result.text.strip().strip('"').strip("'").replace("**", "").replace("*", "")
                if generated_title:
                    title = generated_title
            except Exception as e:
                self._logger.error(f"Failed to generate title: {e}")
            
            if title == "New Chat":
                title = query[:40] + ("..." if len(query) > 40 else "")
            
        return await self._session_repo.create(ChatSession(title=title), owner_id)

    async def _get_history_for_prompt(self, session_id, owner_id, limit: int | None = None) -> list[dict[str, str]]:
        """Build conversation history for the LLM prompt."""
        limit = limit or self._settings.chat_max_history_messages
        messages = await self._message_repo.get_recent(session_id, owner_id, limit=limit)
        return [{"role": m.role, "content": m.content} for m in messages]

    async def _persist_exchange(self, session_id, user_message: str, assistant_message: str, citations: list) -> None:
        """Persist user and assistant messages to the database."""
        citation_payload = json.dumps([c.model_dump() for c in citations])

        user_msg = ChatMessage(
            session_id=session_id,
            role=MessageRole.user.value,
            content=user_message,
        )
        assistant_msg = ChatMessage(
            session_id=session_id,
            role=MessageRole.assistant.value,
            content=assistant_message,
            citations=citation_payload,
        )

        await self._message_repo.create_many([user_msg, assistant_msg])
        
        # Touch session's updated_at to bump it to the top of the history list
        await self._session.execute(
            update(ChatSession)
            .where(ChatSession.id == session_id)
            .values(updated_at=func.now())
        )
            
        await self._session.commit()

    async def _stream_and_persist(self, session_id, messages, citations, sources):
        """Stream answer and persist after completion."""
        collected: list[str] = []

        async for delta in self._rag_svc.generate_answer(messages, stream=True):
            collected.append(delta)
            yield delta

        full_answer = "".join(collected)
        await self._persist_exchange(session_id, messages[-1]["content"], full_answer, citations)

    def _to_message_response(self, msg: ChatMessage) -> ChatMessageResponse:
        """Convert an ORM message to a response schema."""
        citations_data = None
        if msg.citations:
            try:
                citations_data = json.loads(msg.citations)
            except json.JSONDecodeError:
                citations_data = None
        return ChatMessageResponse(
            id=str(msg.id),
            role=msg.role,
            content=msg.content,
            citations=citations_data,
            created_at=msg.created_at.isoformat(),
        )
