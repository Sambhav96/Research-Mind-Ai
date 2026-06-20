"""Workspace model."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import String, Integer, Text
from sqlalchemy import ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.mixins import SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin


class Workspace(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    """Workspace ORM model."""

    __tablename__ = "workspaces"

    owner_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    color: Mapped[str] = mapped_column(String(32), nullable=False, default="#6366f1")
    paper_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
