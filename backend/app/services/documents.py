"""Document service."""

from __future__ import annotations

from pathlib import Path
from uuid import UUID, uuid4

import anyio
from fastapi import UploadFile, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_session_factory

from app.core.config import Settings
from app.core.errors import AppError
from app.models.document import Document, DocumentStatus
from app.models.user import User
from app.repositories.document import DocumentRepository
from app.schemas.documents import DocumentListResponse, DocumentResponse, DocumentUploadResponse
from app.services.chunk import ChunkService
from app.services.embedding import EmbeddingService
from app.services.pdf_parser import PDFParserService
from app.services.vector_search import VectorService


class DocumentService:
    """Document service for PDF uploads and access control."""

    def __init__(self, session: AsyncSession, settings: Settings) -> None:
        self._session = session
        self._settings = settings
        self._repo = DocumentRepository(session)
        self._pdf_parser = PDFParserService()
        self._chunk_svc = ChunkService(session)
        self._embedding_svc = EmbeddingService(session)
        self._vector_svc = VectorService(session)

    async def upload(
        self,
        owner: User,
        file: UploadFile,
        title: str,
        authors: list[str],
        year: int | None,
        doi: str | None,
        background_tasks: BackgroundTasks,
        **kwargs,
    ) -> DocumentUploadResponse:
        """Upload a PDF and create document metadata."""
        self._validate_file(file)

        storage_root = Path(self._settings.storage_root).resolve()
        owner_dir = storage_root / str(owner.id)
        import os
        await anyio.to_thread.run_sync(lambda: os.makedirs(str(owner_dir), exist_ok=True))

        filename = f"{uuid4().hex}.pdf"
        destination = owner_dir / filename

        file_size = await self._save_file(file, destination)
        status = DocumentStatus.uploaded.value

        document = Document(
            owner_id=owner.id,
            workspace_id=kwargs.get("workspace_id"),
            title=title.strip(),
            authors=authors,
            year=year,
            doi=doi.strip() if doi else None,
            file_path=str(destination),
            file_size=file_size,
            status=status,
        )

        await self._repo.create(document)
        await self._session.commit()
        await self._session.refresh(document)

        background_tasks.add_task(process_document_background, document.id)

        return DocumentUploadResponse(document=self._to_response(document))



    async def list_documents(self, owner: User) -> DocumentListResponse:
        """List documents for the current user."""
        documents = await self._repo.list_by_owner(owner.id)
        return DocumentListResponse(items=[self._to_response(doc) for doc in documents])

    async def list_by_workspace(self, owner: User, workspace_id: UUID) -> DocumentListResponse:
        """List documents for a specific workspace."""
        documents = await self._repo.list_by_workspace(owner.id, workspace_id)
        return DocumentListResponse(items=[self._to_response(doc) for doc in documents])

    async def get_document(self, owner: User, document_id: UUID) -> DocumentResponse:
        """Get document details for the owner."""
        document = await self._repo.get_by_id_for_owner(document_id, owner.id)
        if not document:
            raise AppError(code="document_not_found", message="Document not found", status_code=404)
        return self._to_response(document)

    async def delete_document(self, owner: User, document_id: UUID) -> None:
        """Delete a document (hard delete + remove file)."""
        document = await self._repo.get_by_id_for_owner(document_id, owner.id)
        if not document:
            raise AppError(code="document_not_found", message="Document not found", status_code=404)

        await self._repo.hard_delete(document)
        await self._session.commit()

        await self._delete_file(document.file_path)

    async def update_document(self, owner: User, document_id: UUID, data: dict) -> DocumentResponse:
        """Update document metadata."""
        document = await self._repo.get_by_id_for_owner(document_id, owner.id)
        if not document:
            raise AppError(code="document_not_found", message="Document not found", status_code=404)

        updated_doc = await self._repo.update(document, data)
        await self._session.commit()
        await self._session.refresh(updated_doc)
        return self._to_response(updated_doc)

    async def _save_file(self, file: UploadFile, destination: Path) -> int:
        max_size = self._settings.upload_max_size_mb * 1024 * 1024
        total = 0
        try:
            async with await anyio.open_file(destination, "wb") as handle:
                while True:
                    chunk = await file.read(1024 * 1024)
                    if not chunk:
                        break
                    total += len(chunk)
                    if total > max_size:
                        raise AppError(
                            code="file_too_large",
                            message=f"File exceeds {self._settings.upload_max_size_mb}MB",
                            status_code=413,
                        )
                    await handle.write(chunk)
        except Exception:
            if destination.exists():
                await anyio.to_thread.run_sync(destination.unlink)
            raise
        finally:
            await file.close()
        return total

    async def _delete_file(self, file_path: str) -> None:
        path = Path(file_path)
        if not path.exists():
            return
        await anyio.to_thread.run_sync(path.unlink)

    def _validate_file(self, file: UploadFile) -> None:
        content_type = (file.content_type or "").lower()
        filename = (file.filename or "").lower()
        if content_type != "application/pdf" and not filename.endswith(".pdf"):
            raise AppError(code="invalid_file_type", message="Only PDF files are allowed", status_code=400)

    def _to_response(self, document: Document) -> DocumentResponse:
        return DocumentResponse(
            id=document.id,
            owner_id=document.owner_id,
            workspace_id=document.workspace_id,
            title=document.title,
            authors=document.authors,
            year=document.year,
            doi=document.doi,
            file_path=document.file_path,
            file_size=document.file_size,
            status=document.status,
            created_at=document.created_at,
            page_count=document.page_count,
            text_coverage_pct=document.text_coverage_pct,
            ocr_coverage_pct=document.ocr_coverage_pct,
            chunk_count=document.chunk_count,
            embedding_count=document.embedding_count,
            searchable_status=document.searchable_status,
        )


async def process_document_background(document_id: UUID) -> None:
    """Process document: extract text, create chunks, generate embeddings."""
    session_factory = get_session_factory()
    async with session_factory() as session:
        repo = DocumentRepository(session)
        document = await repo.get_by_id(document_id)
        if not document:
            return

        pdf_parser = PDFParserService()
        chunk_svc = ChunkService(session)
        embedding_svc = EmbeddingService(session)

        try:
            document.status = DocumentStatus.parsing.value
            document.processing_progress = 10
            session.add(document)
            await session.commit()

            import anyio
            parsed = await anyio.to_thread.run_sync(pdf_parser.parse, document.file_path)
            pages = parsed.get("pages", [])
            document.page_count = parsed.get("page_count", 0)
            document.text_coverage_pct = parsed.get("text_coverage_pct")
            document.ocr_coverage_pct = parsed.get("ocr_coverage_pct")

            document.status = DocumentStatus.chunking.value
            document.processing_progress = 30
            session.add(document)
            await session.commit()

            chunks = await chunk_svc.chunk_document(document.id, pages)

            document.status = DocumentStatus.embedding.value
            document.processing_progress = 50
            session.add(document)
            await session.commit()

            texts = [c.content for c in chunks]
            if texts:
                embeddings_result = await embedding_svc.embed_batch(texts)
                
                document.processing_progress = 80
                session.add(document)
                await session.commit()

                embedding_updates = []
                for i, chunk in enumerate(chunks):
                    if i < len(embeddings_result.embeddings) and embeddings_result.embeddings[i]:
                        embedding_updates.append({
                            "document_id": document.id,
                            "chunk_index": chunk.chunk_index,
                            "embedding": embeddings_result.embeddings[i],
                        })
                await embedding_svc.store_embeddings(embedding_updates)
                document.embedding_count = len(embedding_updates)

            document.chunk_count = len(chunks) if chunks else 0
            
            # Determine searchable status
            if document.chunk_count == 0:
                document.searchable_status = "None"
            elif document.text_coverage_pct is not None and document.text_coverage_pct + (document.ocr_coverage_pct or 0) >= 99:
                document.searchable_status = "Full"
            else:
                document.searchable_status = "Partial"

            document.status = DocumentStatus.ready.value
            document.processing_progress = 100
            session.add(document)
            await session.commit()
        except Exception as e:
            import traceback
            import logging
            logging.getLogger(__name__).error(f"Processing failed: {e}\n{traceback.format_exc()}")
            document.status = DocumentStatus.failed.value
            session.add(document)
            await session.commit()
