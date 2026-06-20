"""Flashcard schemas."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class FlashcardResponse(BaseModel):
    """Flashcard response."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    deck_id: UUID
    question: str
    answer: str
    topic: str | None = None
    page_reference: str | None = None
    order_index: int


class FlashcardDeckResponse(BaseModel):
    """Flashcard Deck response."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    owner_id: UUID
    document_id: UUID | None = None
    document_name: str | None = None
    card_count: int
    created_at: datetime
    updated_at: datetime


class FlashcardDeckDetailResponse(FlashcardDeckResponse):
    """Deck response with flashcards."""

    cards: list[FlashcardResponse]


class FlashcardAnalyticsResponse(BaseModel):
    total_decks: int
    total_cards: int
    generated_this_week: int
    generated_this_month: int
