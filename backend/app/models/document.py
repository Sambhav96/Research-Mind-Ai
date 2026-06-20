"""Document model."""

from __future__ import annotations

from enum import Enum
from uuid import UUID

from sqlalchemy import Integer, String, Text
from sqlalchemy import ForeignKey
from sqlalchemy.dialects.postgresql import ARRAY, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.mixins import SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin


class DocumentStatus(str, Enum):
    """Document processing status."""
    uploaded = "uploaded"
    parsing = "parsing"
    chunking = "chunking"
    embedding = "embedding"
    processing = "processing"  # legacy alias
    ready = "ready"
    failed = "failed"
    deleted = "deleted"


class Document(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    """Document ORM model."""

    __tablename__ = "documents"

    owner_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    workspace_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(256), nullable=False)
    authors: Mapped[list[str]] = mapped_column(ARRAY(String(128)), nullable=False, default=list)
    year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    doi: Mapped[str | None] = mapped_column(String(128), nullable=True)
    file_path: Mapped[str] = mapped_column(Text, nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    page_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    processing_progress: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default=DocumentStatus.uploaded.value)
    
    # Document Intelligence Metrics
    text_coverage_pct: Mapped[float | None] = mapped_column(nullable=True)
    ocr_coverage_pct: Mapped[float | None] = mapped_column(nullable=True)
    chunk_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    embedding_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    searchable_status: Mapped[str] = mapped_column(String(32), nullable=False, default="Pending")
