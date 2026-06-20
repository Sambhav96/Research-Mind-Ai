"""Vector search schemas."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class SearchResult(BaseModel):
    """Enriched semantic search result."""

    chunk_id: str
    document_id: str
    document_title: str
    page: int
    content: str
    score: float


class SearchRequest(BaseModel):
    """Request schema for semantic search."""

    query: str = Field(min_length=1, max_length=4096)
    limit: int = Field(default=10, ge=1, le=100)
    min_similarity: float = Field(default=0.0, ge=0.0, le=1.0)


class SearchResponse(BaseModel):
    """Response schema for semantic search."""

    results: list[SearchResult]
    query: str
    total: int
