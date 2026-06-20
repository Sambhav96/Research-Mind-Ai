"""Admin Document schemas."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class AdminDocumentListItem(BaseModel):
    """Represents a document row in the admin table."""
    id: UUID
    title: str
    owner_name: str | None
    owner_email: str
    workspace_name: str | None
    status: str
    chunk_count: int
    file_size: int
    created_at: datetime


class AdminDocumentListResponse(BaseModel):
    """Response payload for document list pagination."""
    documents: list[AdminDocumentListItem]
    total: int
    page: int
    size: int


class AdminDocumentStatsResponse(BaseModel):
    """Response payload for top-level document statistics."""
    total_documents: int
    average_size_bytes: float
    average_chunks: float


class AdminDocumentDetailResponse(BaseModel):
    """Deep metadata for a specific document."""
    id: UUID
    title: str
    file_path: str
    file_size: int
    page_count: int | None
    status: str
    processing_progress: int
    created_at: datetime
    
    # Text extraction metrics
    text_coverage_pct: float | None
    ocr_coverage_pct: float | None
    
    # Processed output
    chunk_count: int
    embedding_count: int
    searchable_status: str

    owner_id: UUID
    owner_name: str | None
    owner_email: str
    workspace_id: UUID | None
    workspace_name: str | None
