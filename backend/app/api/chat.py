"""Chat routes."""

from __future__ import annotations

from typing import AsyncGenerator

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.session import get_db_session
from app.models.user import User
from app.schemas.chat import (
    ChatMessageResponse,
    ChatRequest,
    ChatResponse,
    ChatSessionCreate,
    ChatSessionResponse,
    ChatSessionUpdate,
)
from app.services.auth import get_current_user_entity
from app.services.chat import ChatService


router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/sessions", response_model=ChatSessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    body: ChatSessionCreate,
    user: User = Depends(get_current_user_entity),
    session: AsyncSession = Depends(get_db_session),
) -> ChatSessionResponse:
    service = ChatService(session=session, settings=get_settings())
    return await service.create_session(owner_id=user.id, title=body.title)


@router.get("/sessions", response_model=list[ChatSessionResponse])
async def list_sessions(
    user: User = Depends(get_current_user_entity),
    session: AsyncSession = Depends(get_db_session),
) -> list[ChatSessionResponse]:
    service = ChatService(session=session, settings=get_settings())
    return await service.list_sessions(user.id)


@router.get("/sessions/{session_id}", response_model=ChatSessionResponse)
async def get_session(
    session_id,
    user: User = Depends(get_current_user_entity),
    session: AsyncSession = Depends(get_db_session),
) -> ChatSessionResponse:
    import uuid
    service = ChatService(session=session, settings=get_settings())
    result = await service.get_session(session_id=uuid.UUID(str(session_id)), owner_id=user.id)
    if not result:
        from app.core.errors import AppError
        raise AppError(code="session_not_found", message="Session not found", status_code=404)
    return result


@router.post("/sessions/{session_id}/archive", response_model=ChatSessionResponse)
async def archive_session(
    session_id,
    user: User = Depends(get_current_user_entity),
    session: AsyncSession = Depends(get_db_session),
) -> ChatSessionResponse:
    import uuid
    service = ChatService(session=session, settings=get_settings())
    return await service.archive_session(session_id=uuid.UUID(str(session_id)), owner_id=user.id)


@router.patch("/sessions/{session_id}", response_model=ChatSessionResponse)
async def update_session(
    session_id,
    body: ChatSessionUpdate,
    user: User = Depends(get_current_user_entity),
    session: AsyncSession = Depends(get_db_session),
) -> ChatSessionResponse:
    import uuid
    service = ChatService(session=session, settings=get_settings())
    return await service.update_session(
        session_id=uuid.UUID(str(session_id)), owner_id=user.id, title=body.title, selected_document_ids=body.selected_document_ids
    )


@router.delete("/sessions/{session_id}", response_model=ChatSessionResponse)
async def delete_session(
    session_id,
    user: User = Depends(get_current_user_entity),
    session: AsyncSession = Depends(get_db_session),
) -> ChatSessionResponse:
    import uuid
    service = ChatService(session=session, settings=get_settings())
    # Reuse archive_session to perform a soft delete
    return await service.archive_session(session_id=uuid.UUID(str(session_id)), owner_id=user.id)


@router.get("/sessions/{session_id}/messages", response_model=list[ChatMessageResponse])
async def get_history(
    session_id,
    limit: int = 50,
    user: User = Depends(get_current_user_entity),
    session: AsyncSession = Depends(get_db_session),
) -> list[ChatMessageResponse]:
    import uuid
    service = ChatService(session=session, settings=get_settings())
    return await service.get_history(session_id=uuid.UUID(str(session_id)), owner_id=user.id, limit=limit)


@router.post("", response_model=ChatResponse)
async def chat(
    body: ChatRequest,
    user: User = Depends(get_current_user_entity),
    session: AsyncSession = Depends(get_db_session),
) -> ChatResponse:
    service = ChatService(session=session, settings=get_settings())
    return await service.chat(
        owner_id=user.id,
        query=body.query,
        session_id=body.session_id,
        document_ids=body.document_ids,
    )


@router.post("/stream")
async def chat_stream(
    body: ChatRequest,
    user: User = Depends(get_current_user_entity),
    session: AsyncSession = Depends(get_db_session),
):
    from fastapi.responses import StreamingResponse
    service = ChatService(session=session, settings=get_settings())

    async def _gen() -> AsyncGenerator[str, None]:
        async for chunk in service.chat(
            owner_id=user.id,
            query=body.query,
            session_id=body.session_id,
            document_ids=body.document_ids,
            stream=True,
        ):
            yield chunk

    return StreamingResponse(_gen(), media_type="text/event-stream")
