"""Flashcard models."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import ForeignKey, String, Text, Integer
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class FlashcardDeck(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Flashcard Deck ORM model."""

    __tablename__ = "flashcard_decks"

    owner_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    document_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    document_name: Mapped[str | None] = mapped_column(String(256), nullable=True)
    card_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    cards: Mapped[list["Flashcard"]] = relationship(
        "Flashcard", back_populates="deck", cascade="all, delete-orphan", lazy="selectin"
    )


class Flashcard(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Flashcard ORM model."""

    __tablename__ = "flashcards"

    deck_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("flashcard_decks.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    question: Mapped[str] = mapped_column(Text, nullable=False)
    answer: Mapped[str] = mapped_column(Text, nullable=False)
    topic: Mapped[str | None] = mapped_column(String(256), nullable=True)
    page_reference: Mapped[str | None] = mapped_column(String(128), nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    deck: Mapped["FlashcardDeck"] = relationship("FlashcardDeck", back_populates="cards")
