"""Chunk model."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import Integer, Text
from sqlalchemy import ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from pgvector.sqlalchemy import Vector
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class Chunk(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Chunk ORM model for stored document chunks."""

    __tablename__ = "chunks"

    document_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    page_number: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        index=True,
    )
    chunk_index: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        index=True,
    )
    content: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    embedding: Mapped[list[float] | None] = mapped_column(
        Vector(1536),
        nullable=True,
    )
    embedding_v2: Mapped[list[float] | None] = mapped_column(
        Vector(3072),
        nullable=True,
    )
