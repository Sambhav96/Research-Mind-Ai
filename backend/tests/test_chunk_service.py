from __future__ import annotations

import pytest

from app.services.chunk import ChunkService


@pytest.fixture()
def chunk_service() -> ChunkService:
    return ChunkService(session=None)


def test_chunk_text_splits_correctly(chunk_service: ChunkService) -> None:
    text = "a" * 2500
    chunks = chunk_service._chunk_text(text, document_id="123", page_number=1)
    assert len(chunks) > 1
    assert chunks[0].content == "a" * chunk_service.chunk_size
    assert chunks[1].content == "a" * chunk_service.chunk_size


def test_chunk_text_overlap_is_correct(chunk_service: ChunkService) -> None:
    text = "a" * 2500
    chunks = chunk_service._chunk_text(text, document_id="123", page_number=1)
    first_suffix = chunks[0].content[-chunk_service.overlap:]
    next_prefix = chunks[1].content[:chunk_service.overlap]
    assert first_suffix == next_prefix


def test_empty_text_returns_empty_chunks(chunk_service: ChunkService) -> None:
    assert chunk_service._chunk_text("", document_id="123", page_number=1) == []


def test_whitespace_only_returns_empty_chunks(chunk_service: ChunkService) -> None:
    assert chunk_service._chunk_text("   \n\t  ", document_id="123", page_number=1) == []
