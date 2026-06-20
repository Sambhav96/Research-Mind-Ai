"""Embedding schemas."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class EmbeddingResponse(BaseModel):
    """Single embedding result."""

    embedding: list[float]
    token_count: int


class EmbeddingBatchResponse(BaseModel):
    """Batch embedding result."""

    embeddings: list[list[float]]
    total_tokens: int
    failed_count: int = 0
    failed_texts: list[str] = Field(default_factory=list)


class EmbeddingQueryResult(BaseModel):
    """Result from a similarity query."""

    chunk_id: str
    document_id: str
    content: str
    similarity: float


class EmbeddingCostResponse(BaseModel):
    """Cost tracking response."""

    total_tokens: int
    total_embeddings: int
    estimated_cost_usd: float
    batches: int


class ErrorResponse(BaseModel):
    """Standardized error shape."""

    code: str
    message: str
    details: dict[str, Any] | None = None
