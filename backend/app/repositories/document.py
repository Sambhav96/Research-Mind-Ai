"""Document repository."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document


class DocumentRepository:
    """Data access for documents."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, document: Document) -> Document:
        """Create a document record."""
        self._session.add(document)
        await self._session.flush()
        return document

    async def list_by_owner(self, owner_id: UUID) -> list[Document]:
        """List documents for an owner."""
        result = await self._session.execute(
            select(Document)
            .where(Document.owner_id == owner_id, Document.is_deleted.is_(False))
            .order_by(Document.created_at.desc())
        )
        return list(result.scalars().all())

    async def list_by_workspace(self, owner_id: UUID, workspace_id: UUID) -> list[Document]:
        """List documents for a workspace."""
        result = await self._session.execute(
            select(Document)
            .where(
                Document.owner_id == owner_id,
                Document.workspace_id == workspace_id,
                Document.is_deleted.is_(False)
            )
            .order_by(Document.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_by_id_for_owner(self, document_id: UUID, owner_id: UUID) -> Document | None:
        """Fetch a document by id for an owner."""
        result = await self._session.execute(
            select(Document).where(
                Document.id == document_id,
                Document.owner_id == owner_id,
                Document.is_deleted.is_(False),
            )
        )
        return result.scalar_one_or_none()

    async def get_by_id(self, document_id: UUID) -> Document | None:
        """Fetch a document by id regardless of owner."""
        result = await self._session.execute(
            select(Document).where(
                Document.id == document_id,
                Document.is_deleted.is_(False),
            )
        )
        return result.scalar_one_or_none()

    async def mark_deleted(self, document: Document) -> None:
        """Mark a document as deleted."""
        document.soft_delete()
        document.status = "deleted"
        await self._session.flush()

    async def hard_delete(self, document: Document) -> None:
        """Hard delete a document from the database."""
        await self._session.delete(document)
        await self._session.flush()

    async def update(self, document: Document, data: dict) -> Document:
        """Update document fields."""
        for key, value in data.items():
            if hasattr(document, key):
                setattr(document, key, value)
        await self._session.flush()
        return document
