"""Chat service tests."""

from __future__ import annotations

import json
import logging
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.core.errors import AppError
from app.models.chat_message import MessageRole
from app.models.chat_session import ChatSessionStatus
from app.schemas.chat import ChatSessionResponse, ChatMessageResponse, ChatResponse, Citation, ChatSource


def _make_chat_service():
    """Build a ChatService with mocked dependencies."""
    from app.services.chat import ChatService

    svc = ChatService.__new__(ChatService)
    svc._settings = SimpleNamespace(
        chat_max_history_messages=5,
        openai_api_key="sk-test",
        openai_model="gpt-4o",
        openai_temperature=0.2,
        openai_max_tokens=1024,
    )
    svc._logger = MagicMock()
    svc._session = MagicMock()
    svc._session_repo = MagicMock()
    svc._session_repo.create = AsyncMock()
    svc._session_repo.list_by_owner = AsyncMock(return_value=[])
    svc._session_repo.get_by_id = AsyncMock()
    svc._session_repo.archive = AsyncMock()
    svc._message_repo = MagicMock()
    svc._message_repo.get_by_session_id = AsyncMock(return_value=[])
    svc._message_repo.get_recent = AsyncMock(return_value=[])
    svc._message_repo.create_many = AsyncMock()
    svc._rag_svc = MagicMock()
    svc._rag_svc.retrieve = AsyncMock(return_value=([], [], []))
    svc._rag_svc.build_context = MagicMock(return_value="")
    svc._rag_svc.build_prompt = MagicMock(return_value=[])
    svc._rag_svc.generate_answer = AsyncMock(return_value="LLM answer")
    svc._client = MagicMock()
    return svc


def _mock_session(id_str="session-123", owner_id_str="owner-1") -> MagicMock:
    s = MagicMock()
    s.id = id_str
    s.owner_id = owner_id_str
    s.title = "Test Chat"
    s.status = ChatSessionStatus.active.value
    s.created_at = MagicMock(isoformat=MagicMock(return_value="2024-01-01T00:00:00"))
    s.updated_at = MagicMock(isoformat=MagicMock(return_value="2024-01-01T00:00:00"))
    s.is_deleted = False
    s.soft_delete = MagicMock()
    return s


@pytest.mark.asyncio
async def test_create_session():
    svc = _make_chat_service()
    owner_id = "owner-uuid"
    mock_session = _mock_session()
    svc._session_repo.create = AsyncMock(return_value=mock_session)

    resp = await svc.create_session(owner_id=owner_id)
    assert isinstance(resp, ChatSessionResponse)
    assert resp.id == "session-123"


@pytest.mark.asyncio
async def test_list_sessions():
    svc = _make_chat_service()
    mock_session = _mock_session()
    svc._session_repo.list_by_owner = AsyncMock(return_value=[mock_session])

    resp = await svc.list_sessions(owner_id="owner-uuid")
    assert isinstance(resp, list)


@pytest.mark.asyncio
async def test_get_session_found():
    svc = _make_chat_service()
    mock_session = _mock_session()
    svc._session_repo.get_by_id = AsyncMock(return_value=mock_session)

    resp = await svc.get_session(session_id="session-123", owner_id="owner-uuid")
    assert resp is not None


@pytest.mark.asyncio
async def test_get_session_not_found():
    svc = _make_chat_service()
    svc._session_repo.get_by_id = AsyncMock(return_value=None)

    resp = await svc.get_session(session_id="missing", owner_id="owner-uuid")
    assert resp is None


@pytest.mark.asyncio
async def test_archive_session():
    svc = _make_chat_service()
    mock_session = _mock_session()
    svc._session_repo.get_by_id = AsyncMock(return_value=mock_session)

    archived_session = _mock_session()
    archived_session.status = ChatSessionStatus.archived.value
    svc._session_repo.archive = AsyncMock(return_value=archived_session)

    resp = await svc.archive_session(session_id="session-123", owner_id="owner-uuid")
    assert resp.status == ChatSessionStatus.archived.value


@pytest.mark.asyncio
async def test_archive_session_not_found():
    svc = _make_chat_service()
    svc._session_repo.get_by_id = AsyncMock(return_value=None)

    with pytest.raises(AppError) as exc_info:
        await svc.archive_session(session_id="missing", owner_id="owner-uuid")
    assert exc_info.value.code == "session_not_found"


@pytest.mark.asyncio
async def test_get_history():
    svc = _make_chat_service()
    mock_msg = MagicMock()
    mock_msg.id = "msg-1"
    mock_msg.role = MessageRole.user.value
    mock_msg.content = "hello"
    mock_msg.citations = None
    mock_msg.created_at = MagicMock(isoformat=MagicMock(return_value="2024-01-01T00:00:00"))
    svc._message_repo.get_by_session_id = AsyncMock(return_value=[mock_msg])

    resp = await svc.get_history(session_id="session-123", owner_id="owner-uuid")
    assert len(resp) == 1
    assert resp[0].role == "user"


@pytest.mark.asyncio
async def test_chat_creates_session_when_none():
    svc = _make_chat_service()
    mock_session = _mock_session()
    svc._session_repo.get_by_id = AsyncMock(return_value=None)
    svc._session_repo.create = AsyncMock(return_value=mock_session)

    resp = await svc.chat(owner_id="owner-uuid", query="What is ML?", session_id=None)
    assert isinstance(resp, ChatResponse)


@pytest.mark.asyncio
async def test_chat_with_existing_session():
    svc = _make_chat_service()
    mock_session = _mock_session()
    svc._session_repo.get_by_id = AsyncMock(return_value=mock_session)

    resp = await svc.chat(owner_id="owner-uuid", query="What is ML?", session_id="session-123")
    assert isinstance(resp, ChatResponse)


@pytest.mark.asyncio
async def test_chat_session_not_found():
    svc = _make_chat_service()
    svc._session_repo.get_by_id = AsyncMock(return_value=None)
    svc._session_repo.create = AsyncMock()

    with pytest.raises(AppError) as exc_info:
        await svc.chat(owner_id="owner-uuid", query="test", session_id="missing")
    assert exc_info.value.code == "session_not_found"
