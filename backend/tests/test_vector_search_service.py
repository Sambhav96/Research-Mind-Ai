"""Vector search service tests."""

from __future__ import annotations

import logging
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.core.errors import AppError
from app.schemas.vector_search import SearchResult, SearchResponse
from app.services.vector_search import VectorService


@pytest.fixture()
def vector_service():
    svc = VectorService.__new__(VectorService)
    svc._settings = SimpleNamespace(
        embedding_dimensions=1536,
    )
    svc._logger = logging.getLogger("scholarmind.vector")
    svc._chunk_repo = MagicMock()
    svc._doc_repo = MagicMock()
    return svc


def _make_chunk(chunk_id="c1", doc_id="d1", page=1, idx=0, content="hello world"):
    chunk = MagicMock()
    chunk.id = chunk_id
    chunk.document_id = doc_id
    chunk.page_number = page
    chunk.chunk_index = idx
    chunk.content = content
    return chunk


def _make_document(doc_id="d1", owner_id="o1", title="Research Paper"):
    doc = MagicMock()
    doc.id = doc_id
    doc.owner_id = owner_id
    doc.title = title
    return doc


@pytest.mark.asyncio
async def test_add_embeddings_delegates_to_repo(vector_service):
    vector_service._chunk_repo.upsert_embeddings = AsyncMock(return_value=2)
    embeddings = [
        {"chunk_index": 0, "embedding": [0.1, 0.2]},
        {"chunk_index": 1, "embedding": [0.3, 0.4]},
    ]
    count = await vector_service.add_embeddings("doc-123", embeddings)
    assert count == 2
    vector_service._chunk_repo.upsert_embeddings.assert_called_once()


@pytest.mark.asyncio
async def test_search_returns_enriched_results(vector_service):
    chunk = _make_chunk(content="machine learning concepts")
    doc = _make_document(doc_id="d1", title="ML Paper")
    vector_service._chunk_repo.search_similar = AsyncMock(
        return_value=[(chunk, 0.92)]
    )
    vector_service._doc_repo.get_by_id_for_owner = AsyncMock(return_value=doc)

    response = await vector_service.search(
        query_embedding=[0.1] * 1536,
        limit=10,
        min_similarity=0.5,
        owner_id="owner-uuid",
    )

    assert isinstance(response, SearchResponse)
    assert len(response.results) == 1
    result = response.results[0]
    assert result.chunk_id == "c1"
    assert result.document_id == "d1"
    assert result.document_title == "ML Paper"
    assert result.page == 1
    assert result.content == "machine learning concepts"
    assert result.score == 0.92


@pytest.mark.asyncio
async def test_search_filters_by_owner(vector_service):
    chunk = _make_chunk(doc_id="d1")
    doc = _make_document(doc_id="d1", owner_id="owner-uuid")
    vector_service._chunk_repo.search_similar = AsyncMock(
        return_value=[(chunk, 0.85)]
    )
    vector_service._doc_repo.get_by_id_for_owner = AsyncMock(return_value=doc)

    response = await vector_service.search(
        query_embedding=[0.1] * 1536,
        owner_id="owner-uuid",
    )
    assert len(response.results) == 1


@pytest.mark.asyncio
async def test_search_skips_document_not_found(vector_service):
    chunk = _make_chunk(doc_id="d-missing")
    vector_service._chunk_repo.search_similar = AsyncMock(
        return_value=[(chunk, 0.7)]
    )
    vector_service._doc_repo.get_by_id_for_owner = AsyncMock(return_value=None)

    response = await vector_service.search(
        query_embedding=[0.1] * 1536,
    )
    assert len(response.results) == 0


@pytest.mark.asyncio
async def test_search_raises_on_empty_embedding(vector_service):
    with pytest.raises(AppError) as exc_info:
        await vector_service.search(query_embedding=[])
    assert exc_info.value.code == "invalid_query"
    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_search_raises_on_dimension_mismatch(vector_service):
    with pytest.raises(AppError) as exc_info:
        await vector_service.search(query_embedding=[0.1, 0.2, 0.3])
    assert exc_info.value.code == "dimension_mismatch"
    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_delete_embeddings_delegates_to_repo(vector_service):
    vector_service._chunk_repo.delete_embeddings_by_document_id = AsyncMock(return_value=5)
    count = await vector_service.delete_embeddings("doc-123")
    assert count == 5
    vector_service._chunk_repo.delete_embeddings_by_document_id.assert_called_once_with("doc-123")
