"""Chat-related schemas."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class Citation(BaseModel):
    """Individual citation reference for a retrieved chunk."""

    chunk_id: str
    document_id: str
    document_title: str
    page: int
    content: str
    score: float


class ChatSource(BaseModel):
    """Source document metadata for the answer context."""

    document_id: str
    title: str
    page: int
    chunk_id: str
    relevance_score: float


class ChatResponse(BaseModel):
    """Standard non-streaming chat response."""

    answer: str
    session_id: str | None = None
    citations: list[Citation] = Field(default_factory=list)
    sources: list[ChatSource] = Field(default_factory=list)


class ChatStreamChunk(BaseModel):
    """Single streaming chunk."""

    delta: str
    done: bool


class ChatRequest(BaseModel):
    """Incoming chat query."""

    session_id: str | None = None
    query: str = Field(min_length=1, max_length=4096)
    document_ids: list[str] | None = Field(default=None, description="Restrict search to these documents.")


class ChatSessionCreate(BaseModel):
    """Create a new chat session."""

    title: str = Field(default="New Chat", max_length=256)


class ChatSessionUpdate(BaseModel):
    """Update an existing chat session."""

    title: str | None = Field(default=None, max_length=256)
    selected_document_ids: list[str] | None = None


class ChatSessionResponse(BaseModel):
    """Chat session metadata."""

    id: str
    title: str
    status: str
    created_at: str
    updated_at: str
    selected_document_ids: list[str] | None = None


class ChatMessageResponse(BaseModel):
    """Persisted chat message."""

    id: str
    role: str
    content: str
    citations: list[dict[str, Any]] | None = None
    created_at: str
