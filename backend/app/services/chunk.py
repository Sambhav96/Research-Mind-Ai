"""Chunk service for document chunking."""

from __future__ import annotations

import logging
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.models.chunk import Chunk
from app.repositories.chunk import ChunkRepository


class ChunkService:
    """Service for chunking document content and persisting chunks."""

    chunk_size: int = 1000
    overlap: int = 200

    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repo = ChunkRepository(session)
        self._logger = logging.getLogger("scholarmind.chunk")

    async def chunk_document(self, document_id: UUID, pages: list[dict]) -> list[Chunk]:
        """Chunk all pages of a document and store them in the database.

        Args:
            document_id: The document to chunk.
            pages: List of dicts with at least "page_number" (int) and "text" (str).

        Returns:
            List of created Chunk instances.
        """
        if not pages:
            return []

        chunks: list[Chunk] = []
        for page in pages:
            page_number = page["page_number"]
            text = page.get("text", "")
            page_chunks = self._chunk_text(text, document_id, page_number)
            chunks.extend(page_chunks)

        if chunks:
            await self._repo.create_many(chunks)

        self._logger.info(
            "Chunked document",
            extra={
                "document_id": str(document_id),
                "chunk_count": len(chunks),
                "page_count": len(pages),
            },
        )
        return chunks

    async def get_chunks(self, document_id: UUID) -> list[Chunk]:
        """Retrieve all chunks for a document ordered by chunk_index."""
        return await self._repo.get_by_document_id(document_id)

    async def delete_chunks(self, document_id: UUID) -> None:
        """Delete all chunks for a document."""
        count = await self._repo.delete_by_document_id(document_id)
        self._logger.info(
            "Deleted chunks",
            extra={"document_id": str(document_id), "deleted_count": count},
        )

    def _chunk_text(self, text: str, document_id: UUID, page_number: int) -> list[Chunk]:
        """Split text into overlapping chunks and return Chunk instances (not yet persisted)."""
        if not text.strip():
            return []

        chunks: list[Chunk] = []
        start = 0
        chunk_index = 0

        while start < len(text):
            end = start + self.chunk_size
            segment = text[start:end]

            if not segment.strip():
                break

            chunks.append(
                Chunk(
                    document_id=document_id,
                    page_number=page_number,
                    chunk_index=chunk_index,
                    content=segment.strip(),
                )
            )
            chunk_index += 1
            start = end - self.overlap

        return chunks
