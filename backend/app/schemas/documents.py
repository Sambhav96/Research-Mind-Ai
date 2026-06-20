"""Document schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class DocumentResponse(BaseModel):
    """Document response payload."""

    id: UUID
    owner_id: UUID
    workspace_id: UUID | None = None
    title: str
    authors: list[str] = Field(default_factory=list)
    year: int | None = None
    doi: str | None = None
    file_path: str
    file_size: int
    page_count: int | None = None
    status: str
    processing_progress: int = 0
    created_at: datetime
    
    # Document Intelligence Metrics
    text_coverage_pct: float | None = None
    ocr_coverage_pct: float | None = None
    chunk_count: int = 0
    embedding_count: int = 0
    searchable_status: str = "Pending"


class DocumentListResponse(BaseModel):
    """List of documents."""

    items: list[DocumentResponse]


class DocumentUploadResponse(BaseModel):
    """Document upload response."""

    document: DocumentResponse


class DocumentUpdate(BaseModel):
    """Document update payload."""
    title: str | None = None
    workspace_id: UUID | None = None
    authors: list[str] | None = None
    year: int | None = None
    doi: str | None = None
