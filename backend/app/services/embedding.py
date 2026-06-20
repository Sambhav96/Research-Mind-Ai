"""Embedding service — generates and persists Gemini vector embeddings."""

from __future__ import annotations

import logging
from typing import Sequence

from app.core.config import get_settings
from app.core.errors import AppError
from app.repositories.chunk import ChunkRepository
from app.schemas.embedding import EmbeddingResponse, EmbeddingBatchResponse
from app.services.ai.gemini_provider import GeminiEmbeddingProvider


class EmbeddingService:
    """Service for generating Gemini embeddings and storing them in pgvector."""

    def __init__(self, session) -> None:
        self._settings = get_settings()
        from app.services.ai.provider import get_embedding_provider
        self._provider = get_embedding_provider()
        self._logger = logging.getLogger("scholarmind.embedding")
        self._chunk_repo = ChunkRepository(session)

    async def embed_text(self, text: str) -> EmbeddingResponse:
        """Generate an embedding for a single text string.

        Args:
            text: The text to embed.

        Returns:
            EmbeddingResponse containing the vector and token count.
        """
        result = await self.embed_batch([text])
        if result.failed_count > 0:
            raise AppError(
                code="embedding_failed",
                message="Embedding generation failed for all texts",
                status_code=502,
                details={"failed_texts": result.failed_texts},
            )
        return EmbeddingResponse(embedding=result.embeddings[0], token_count=result.total_tokens)

    async def embed_batch(self, texts: list[str]) -> EmbeddingBatchResponse:
        """Generate embeddings for a list of texts with batching and retries.

        Args:
            texts: List of texts to embed.

        Returns:
            EmbeddingBatchResponse with all successful embeddings and token stats.
        """
        if not texts:
            return EmbeddingBatchResponse(embeddings=[], total_tokens=0)

        try:
            result = await self._provider.embed_texts(texts)
        except Exception as exc:
            self._logger.error(
                "Embedding batch failed",
                extra={"error": str(exc), "count": len(texts)},
            )
            raise AppError(
                code="embedding_failed",
                message="Embedding generation failed for all texts",
                status_code=502,
                details={"failed_texts": [t[:100] for t in texts]},
            )

        failed_texts = [texts[i][:100] for i in result.failed_indices]

        self._logger.debug(
            "Embedded batch",
            extra={
                "count": len(texts),
                "failed": result.failed_count,
                "dims": self._provider.dimensions,
            },
        )

        return EmbeddingBatchResponse(
            embeddings=result.embeddings,
            total_tokens=result.total_tokens,
            failed_count=result.failed_count,
            failed_texts=failed_texts,
        )

    async def embed_query(self, query: str) -> list[float]:
        """Generate an embedding optimized for semantic similarity queries.

        Args:
            query: The search query string.

        Returns:
            The embedding vector as a list of floats.
        """
        try:
            return await self._provider.embed_query(query)
        except Exception as exc:
            self._logger.error(f"Query embedding failed: {exc}")
            raise AppError(
                code="embedding_failed",
                message="Embedding generation failed for all texts",
                status_code=502,
                details={"failed_texts": [query]},
            )

    async def store_embeddings(
        self,
        updates: list[dict[str, str | int | list[float]]],
    ) -> int:
        """Persist embedding vectors to the chunks table via pgvector.

        Args:
            updates: List of dicts with document_id, chunk_index, and embedding.

        Returns:
            Number of rows updated.
        """
        count = await self._chunk_repo.upsert_embeddings(updates)
        self._logger.info(
            "Stored embeddings",
            extra={"updated_count": count, "total_requested": len(updates)},
        )
        return count

    @property
    def dimensions(self) -> int:
        """Return current embedding dimensions."""
        return self._provider.dimensions
