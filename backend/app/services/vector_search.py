"""Vector search service for semantic retrieval with pgvector."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Sequence

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.errors import AppError
from app.models.document import Document
from app.models.chunk import Chunk
from app.repositories.chunk import ChunkRepository
from app.repositories.document import DocumentRepository
from app.schemas.vector_search import SearchResult, SearchResponse


@dataclass
class _VectorSearchResult:
    """Internal representation of a search hit before schema conversion."""

    chunk: Chunk
    document: Document
    score: float


class VectorService:
    """Service for semantic vector search using pgvector cosine similarity."""

    def __init__(self, session: AsyncSession) -> None:
        self._settings = get_settings()
        self._chunk_repo = ChunkRepository(session)
        self._doc_repo = DocumentRepository(session)
        self._logger = logging.getLogger("scholarmind.vector")

    async def add_embeddings(
        self,
        document_id: str,
        embeddings: list[dict[str, str | int | list[float]]],
    ) -> int:
        """Persist embedding vectors for chunks of a document.

        Args:
            document_id: UUID of the target document.
            embeddings: List of dicts with chunk_index (int) and embedding (list[float]).

        Returns:
            Number of rows updated.
        """
        updates: list[dict[str, str | int | list[float]]] = []
        for item in embeddings:
            updates.append({
                "document_id": document_id,
                "chunk_index": item["chunk_index"],
                "embedding": item["embedding"],
            })

        count = await self._chunk_repo.upsert_embeddings(updates)
        self._logger.info(
            "Added embeddings",
            extra={"document_id": document_id, "updated_count": count},
        )
        return count

    async def search(
        self,
        query_embedding: list[float],
        limit: int = 10,
        min_similarity: float = 0.0,
        owner_id: str | None = None,
        document_ids: list[str] | None = None,
    ) -> SearchResponse:
        """Perform semantic similarity search using cosine distance.

        Args:
            query_embedding: Query vector to compare against stored embeddings.
            limit: Maximum number of results to return.
            min_similarity: Minimum cosine similarity threshold (0.0 - 1.0).
            owner_id: If provided, restrict results to documents owned by this user.

        Returns:
            SearchResponse with enriched hits including chunk, document, page, and score.

        Raises:
            AppError: If the search fails due to a missing or invalid query embedding.
        """
        if not query_embedding:
            raise AppError(
                code="invalid_query",
                message="Query embedding is empty",
                status_code=400,
            )

        if len(query_embedding) != self._settings.embedding_dimensions:
            raise AppError(
                code="dimension_mismatch",
                message=(
                    f"Query embedding has {len(query_embedding)} dimensions; "
                    f"expected {self._settings.embedding_dimensions}"
                ),
                status_code=400,
            )

        target_doc_ids = document_ids
        if owner_id:
            import uuid
            owner_uuid = uuid.UUID(owner_id) if isinstance(owner_id, str) else owner_id
            # Get all document IDs owned by this user
            owner_docs = await self._doc_repo.list_by_owner(owner_uuid)
            owner_doc_ids = [str(doc.id) for doc in owner_docs]
            if target_doc_ids is not None:
                # Intersect requested document_ids with owner_doc_ids
                target_doc_ids = [doc_id for doc_id in target_doc_ids if doc_id in owner_doc_ids]
                if not target_doc_ids:
                    return SearchResponse(results=[], query="", total=0)
            else:
                target_doc_ids = owner_doc_ids
                if not target_doc_ids:
                    return SearchResponse(results=[], query="", total=0)

        raw_results = []
        if target_doc_ids and len(target_doc_ids) > 1:
            import asyncio
            
            # Fetch results for each document sequentially
            doc_results_list = []
            for doc_id in target_doc_ids:
                res = await self._chunk_repo.search_similar(
                    query_embedding=query_embedding,
                    limit=limit,
                    min_similarity=min_similarity,
                    document_ids=[doc_id],
                )
                doc_results_list.append(res)
            
            # Filter out empty results
            per_doc_results = [res for res in doc_results_list if res]
            
            # Round-robin merge to ensure equal representation
            idx = 0
            while len(raw_results) < limit and per_doc_results:
                # keep only lists that have an element at the current idx
                per_doc_results = [lst for lst in per_doc_results if idx < len(lst)]
                if not per_doc_results:
                    break
                for lst in per_doc_results:
                    if len(raw_results) >= limit:
                        break
                    raw_results.append(lst[idx])
                idx += 1
                
            # Re-sort the final selection by score descending
            raw_results.sort(key=lambda x: x[1], reverse=True)
        else:
            raw_results = await self._chunk_repo.search_similar(
                query_embedding=query_embedding,
                limit=limit,
                min_similarity=min_similarity,
                document_ids=target_doc_ids,
            )

        enriched: list[SearchResult] = []

        for chunk, score in raw_results:
            doc = await self._doc_repo.get_by_id(chunk.document_id)
            if doc is None:
                continue

            enriched.append(
                SearchResult(
                    chunk_id=str(chunk.id),
                    document_id=str(chunk.document_id),
                    document_title=doc.title,
                    page=chunk.page_number,
                    content=chunk.content,
                    score=round(score, 6),
                )
            )

        self._logger.debug(
            "Semantic search completed",
            extra={
                "query_dimensions": len(query_embedding),
                "raw_results": len(raw_results),
                "returned": len(enriched),
            },
        )

        return SearchResponse(results=enriched, query="", total=len(enriched))

    async def delete_embeddings(self, document_id: str) -> int:
        """Clear embedding vectors for all chunks of a document.

        Args:
            document_id: UUID of the target document.

        Returns:
            Number of rows updated.
        """
        doc_uuid = document_id if hasattr(document_id, "hex") else str(document_id)
        count = await self._chunk_repo.delete_embeddings_by_document_id(doc_uuid)
        self._logger.info(
            "Deleted embeddings",
            extra={"document_id": document_id, "cleared_count": count},
        )
        return count
