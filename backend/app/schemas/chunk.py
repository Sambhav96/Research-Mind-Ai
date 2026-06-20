"""Chunk schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class ChunkResponse(BaseModel):
    """Chunk response payload."""

    id: UUID
    document_id: UUID
    page_number: int
    chunk_index: int
    content: str
    created_at: datetime


class ChunkBulkCreateRequest(BaseModel):
    """Request for creating multiple chunks for a document."""

    document_id: UUID
    page_contents: list[dict[str, Any]] = Field(
        default_factory=list,
        description="Ordered list of {page_number, content} entries to chunk and store.",
    )


class ChunkListResponse(BaseModel):
    """List of chunks."""

    items: list[ChunkResponse]
