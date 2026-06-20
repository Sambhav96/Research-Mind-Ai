"""Chunk repository."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import literal

from app.models.chunk import Chunk


class ChunkRepository:
    """Data access for chunks."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, chunk: Chunk) -> Chunk:
        """Persist a single chunk."""
        self._session.add(chunk)
        
        await self._session.flush()
        return chunk

    async def create_many(self, chunks: list[Chunk]) -> list[Chunk]:
        """Persist multiple chunks in a single transaction."""
        self._session.add_all(chunks)
        await self._session.flush()
        return chunks

    async def upsert_embeddings(self, updates: list[dict[str, str | int | list[float]]]) -> int:
        """Bulk-update embedding vectors for chunks by document_id + chunk_index.

        Args:
            updates: List of dicts with keys: document_id (UUID), chunk_index (int), embedding (list[float]).

        Returns:
            Number of rows updated.
        """
        updated = 0
        for item in updates:
            result = await self._session.execute(
                update(Chunk)
                .where(
                    Chunk.document_id == item["document_id"],
                    Chunk.chunk_index == item["chunk_index"],
                )
                .values(embedding_v2=item["embedding"])
            )
            updated += result.rowcount or 0
        return updated

    async def search_similar(
        self,
        query_embedding: list[float],
        limit: int = 10,
        min_similarity: float = 0.0,
        document_ids: list[str] | None = None,
    ) -> list[tuple[Chunk, float]]:
        """Search chunks by cosine similarity of embedding vectors.

        Uses pgvector cosine distance (1 - cosine_similarity) for efficient ANN search.

        Args:
            query_embedding: Query vector to compare against.
            limit: Maximum number of results to return.
            min_similarity: Minimum cosine similarity threshold (0.0-1.0).
            document_ids: Optional list of document IDs to restrict search to.

        Returns:
            List of (Chunk, similarity_score) tuples ordered by descending similarity.
        """
        distance_expr = Chunk.embedding_v2.cosine_distance(literal(query_embedding))
        similarity_expr = 1 - distance_expr

        stmt = (
            select(Chunk, similarity_expr.label("similarity"))
            .where(Chunk.embedding_v2.isnot(None))
            .where(similarity_expr >= min_similarity)
        )
        
        if document_ids is not None:
            stmt = stmt.where(Chunk.document_id.in_(document_ids))
            
        stmt = (
            stmt.order_by(similarity_expr.desc())
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        rows = result.all()
        return [(row.Chunk, float(row.similarity)) for row in rows]

    async def delete_embeddings_by_document_id(self, document_id: UUID) -> int:
        """Delete embedding vectors for all chunks of a document.

        Args:
            document_id: Document whose chunk embeddings should be cleared.

        Returns:
            Number of rows updated.
        """
        result = await self._session.execute(
            update(Chunk)
            .where(Chunk.document_id == document_id)
            .values(embedding_v2=None)
        )
        return result.rowcount or 0

    async def get_by_document_id(self, document_id: UUID) -> list[Chunk]:
        """Fetch all chunks for a document ordered by chunk_index."""
        result = await self._session.execute(
            select(Chunk)
            .where(Chunk.document_id == document_id)
            .order_by(Chunk.chunk_index)
        )
        return list(result.scalars().all())

    async def get_chunk(self, document_id: UUID, page_number: int, chunk_index: int) -> Chunk | None:
        """Fetch a specific chunk by document, page, and index."""
        result = await self._session.execute(
            select(Chunk).where(
                Chunk.document_id == document_id,
                Chunk.page_number == page_number,
                Chunk.chunk_index == chunk_index,
            )
        )
        return result.scalar_one_or_none()

    async def delete_by_document_id(self, document_id: UUID) -> int:
        """Delete all chunks for a document. Returns the count of deleted rows."""
        result = await self._session.execute(
            delete(Chunk).where(Chunk.document_id == document_id)
        )
        return result.rowcount
