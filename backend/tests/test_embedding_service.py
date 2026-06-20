"""Embedding service tests."""

from __future__ import annotations

import logging
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.schemas.embedding import EmbeddingBatchResponse, EmbeddingResponse
from app.utils.cost_tracker import EmbeddingCostTracker, CostSummary


def test_cost_tracker_initial_state():
    tracker = EmbeddingCostTracker(env="test")
    summary = tracker.get_summary()
    assert summary.total_tokens == 0
    assert summary.total_embeddings == 0
    assert summary.estimated_cost_usd == 0.0


@pytest.mark.asyncio
async def test_cost_tracker_accumulates():
    tracker = EmbeddingCostTracker(env="test", _cost_per_million_tokens=0.02)
    summary1 = tracker.record_batch(token_count=500, embedding_count=10)
    assert summary1.total_tokens == 500
    assert summary1.total_embeddings == 10
    assert summary1.estimated_cost_usd == pytest.approx(0.00001, abs=1e-8)


@pytest.mark.asyncio
async def test_cost_tracker_resets():
    tracker = EmbeddingCostTracker(env="test", _cost_per_million_tokens=0.02)
    tracker.record_batch(token_count=500, embedding_count=10)
    tracker.reset()
    assert tracker.get_summary().total_tokens == 0


@pytest.mark.asyncio
async def test_store_embeddings_calls_repo():
    settings = SimpleNamespace(
        embedding_model="text-embedding-3-small",
        embedding_cost_per_million_tokens=0.02,
    )

    chunk_repo = MagicMock()
    chunk_repo.upsert_embeddings = AsyncMock(return_value=3)

    from app.utils.cost_tracker import EmbeddingCostTracker

    svc_attrs = {
        "_settings": settings,
        "_logger": MagicMock(),
        "_chunk_repo": chunk_repo,
        "_tracker": MagicMock(),
    }
    from app.services.embedding import EmbeddingService

    svc = EmbeddingService.__new__(EmbeddingService)
    for k, v in svc_attrs.items():
        setattr(svc, k, v)

    updates = [
        {"document_id": "uuid-1", "chunk_index": 0, "embedding": [0.1, 0.2]},
    ]
    count = await svc.store_embeddings(updates)
    assert count == 3


@pytest.mark.asyncio
async def test_embed_query_delegates_to_embed_text():
    settings = SimpleNamespace(
        embedding_model="text-embedding-3-small",
        embedding_cost_per_million_tokens=0.02,
    )

    from app.services.embedding import EmbeddingService

    svc = EmbeddingService.__new__(EmbeddingService)
    svc._settings = settings
    svc._logger = MagicMock()
    svc._chunk_repo = MagicMock()
    svc.embed_text = AsyncMock(
        return_value=EmbeddingResponse(embedding=[0.9, 0.8, 0.7], token_count=3)
    )

    vector = await svc.embed_query("search term")
    assert vector == [0.9, 0.8, 0.7]
