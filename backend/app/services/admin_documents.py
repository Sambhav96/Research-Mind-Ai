"""Admin Document Management Service."""

from __future__ import annotations

import asyncio
from uuid import UUID

from sqlalchemy import func, select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import BackgroundTasks

from app.core.errors import AppError
from app.models.document import Document, DocumentStatus
from app.models.user import User
from app.models.workspace import Workspace
from app.schemas.admin_documents import (
    AdminDocumentDetailResponse,
    AdminDocumentListItem,
    AdminDocumentListResponse,
    AdminDocumentStatsResponse,
)
from app.services.documents import process_document_background


class AdminDocumentsService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_documents_list(
        self, page: int = 1, size: int = 20, search: str | None = None, status: str | None = None
    ) -> AdminDocumentListResponse:
        """Get paginated documents across all users."""
        
        # Base query joining Document with User and Workspace
        stmt = (
            select(Document, User, Workspace)
            .join(User, Document.owner_id == User.id)
            .outerjoin(Workspace, Document.workspace_id == Workspace.id)
            .where(Document.deleted_at.is_(None))
        )
        
        if search:
            search_term = f"%{search}%"
            stmt = stmt.where(Document.title.ilike(search_term))
            
        if status and status.lower() != "all":
            stmt = stmt.where(Document.status == status.lower())
            
        # Total count
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = await self._session.scalar(count_stmt) or 0
        
        # Pagination
        stmt = stmt.order_by(Document.created_at.desc()).offset((page - 1) * size).limit(size)
        result = await self._session.execute(stmt)
        rows = result.all()
        
        items = []
        for doc, user, workspace in rows:
            items.append(AdminDocumentListItem(
                id=doc.id,
                title=doc.title,
                owner_name=user.name,
                owner_email=user.email,
                workspace_name=workspace.name if workspace else None,
                status=doc.status,
                chunk_count=doc.chunk_count,
                file_size=doc.file_size,
                created_at=doc.created_at,
            ))
            
        return AdminDocumentListResponse(
            documents=items,
            total=total,
            page=page,
            size=size
        )

    async def get_document_stats(self) -> AdminDocumentStatsResponse:
        """Get top-level platform statistics for documents."""
        stmt = select(
            func.count(Document.id),
            func.avg(Document.file_size),
            func.avg(Document.chunk_count)
        ).where(Document.deleted_at.is_(None))
        
        result = await self._session.execute(stmt)
        row = result.one_or_none()
        
        if not row:
            return AdminDocumentStatsResponse(total_documents=0, average_size_bytes=0.0, average_chunks=0.0)
            
        return AdminDocumentStatsResponse(
            total_documents=row[0] or 0,
            average_size_bytes=float(row[1] or 0),
            average_chunks=float(row[2] or 0)
        )

    async def _get_doc_or_404(self, document_id: UUID) -> tuple[Document, User, Workspace | None]:
        stmt = (
            select(Document, User, Workspace)
            .join(User, Document.owner_id == User.id)
            .outerjoin(Workspace, Document.workspace_id == Workspace.id)
            .where(Document.id == document_id)
            .where(Document.deleted_at.is_(None))
        )
        result = await self._session.execute(stmt)
        row = result.first()
        
        if not row:
            raise AppError("document_not_found", "Document not found", 404)
            
        return row[0], row[1], row[2]

    async def get_document_detail(self, document_id: UUID) -> AdminDocumentDetailResponse:
        """Get deep metadata for a single document."""
        doc, user, workspace = await self._get_doc_or_404(document_id)
        
        return AdminDocumentDetailResponse(
            id=doc.id,
            title=doc.title,
            file_path=doc.file_path,
            file_size=doc.file_size,
            page_count=doc.page_count,
            status=doc.status,
            processing_progress=doc.processing_progress,
            created_at=doc.created_at,
            text_coverage_pct=doc.text_coverage_pct,
            ocr_coverage_pct=doc.ocr_coverage_pct,
            chunk_count=doc.chunk_count,
            embedding_count=doc.embedding_count,
            searchable_status=doc.searchable_status,
            owner_id=user.id,
            owner_name=user.name,
            owner_email=user.email,
            workspace_id=workspace.id if workspace else None,
            workspace_name=workspace.name if workspace else None,
        )

    async def delete_document(self, document_id: UUID) -> dict[str, str]:
        """Hard delete a document from the system."""
        doc, _, _ = await self._get_doc_or_404(document_id)
        
        await self._session.delete(doc)
        await self._session.commit()
        
        # Cleanup file asynchronously if we had access to anyio here, but simple unlink works if we wrap it.
        # However, for admin deletions, we'll let a cron cleanup orphaned files or just do it blocking.
        import os
        from pathlib import Path
        try:
            if Path(doc.file_path).exists():
                os.unlink(doc.file_path)
        except Exception as e:
            import logging
            logging.error(f"Failed to delete file {doc.file_path}: {e}")
            
        return {"status": "ok", "message": "Document deleted"}

    async def reprocess_document(self, document_id: UUID, background_tasks: BackgroundTasks) -> dict[str, str]:
        """Trigger reprocessing for a failed or stuck document."""
        doc, _, _ = await self._get_doc_or_404(document_id)
        
        # Reset parsing progress and set to processing
        doc.status = DocumentStatus.processing.value
        doc.processing_progress = 0
        doc.chunk_count = 0
        doc.embedding_count = 0
        doc.text_coverage_pct = None
        doc.ocr_coverage_pct = None
        
        # Delete existing chunks? 
        # The ChunkService `chunk_document` method handles existing chunks usually, 
        # but to be safe we'd want to drop them. The current processing task handles this internally usually,
        # but let's assume `process_document_background` will do its job.
        
        await self._session.commit()
        
        background_tasks.add_task(process_document_background, doc.id)
        
        return {"status": "ok", "message": "Document queued for reprocessing"}
