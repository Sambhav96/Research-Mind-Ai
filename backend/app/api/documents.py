"""Document routes."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, UploadFile, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.session import get_db_session
from app.models.user import User
from app.schemas.documents import DocumentListResponse, DocumentResponse, DocumentUploadResponse, DocumentUpdate
from app.services.auth import get_current_user_entity
from app.services.documents import DocumentService

router = APIRouter(prefix="/documents", tags=["documents"])


def _parse_authors(value: str | None) -> list[str]:
    if not value:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]


@router.post("/upload", response_model=DocumentUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    background_tasks: BackgroundTasks,
    title: str = Form(...),
    authors: str | None = Form(None),
    year: int | None = Form(None),
    doi: str | None = Form(None),
    workspace_id: UUID | None = Form(None),
    file: UploadFile = File(...),
    user: User = Depends(get_current_user_entity),
    session: AsyncSession = Depends(get_db_session),
) -> DocumentUploadResponse:
    """Upload a PDF document."""
    service = DocumentService(session=session, settings=get_settings())
    return await service.upload(
        owner=user,
        file=file,
        background_tasks=background_tasks,
        title=title,
        authors=_parse_authors(authors),
        year=year,
        doi=doi,
        workspace_id=workspace_id,
    )


@router.get("", response_model=DocumentListResponse)
async def list_documents(
    user: User = Depends(get_current_user_entity),
    session: AsyncSession = Depends(get_db_session),
) -> DocumentListResponse:
    """List documents for the current user."""
    service = DocumentService(session=session, settings=get_settings())
    return await service.list_documents(user)


@router.get("/{document_id}", response_model=DocumentResponse)
async def document_details(
    document_id: UUID,
    user: User = Depends(get_current_user_entity),
    session: AsyncSession = Depends(get_db_session),
) -> DocumentResponse:
    """Get document details."""
    service = DocumentService(session=session, settings=get_settings())
    return await service.get_document(user, document_id)


@router.patch("/{document_id}", response_model=DocumentResponse)
async def update_document(
    document_id: UUID,
    update_data: DocumentUpdate,
    user: User = Depends(get_current_user_entity),
    session: AsyncSession = Depends(get_db_session),
) -> DocumentResponse:
    """Update document details."""
    service = DocumentService(session=session, settings=get_settings())
    return await service.update_document(user, document_id, update_data.model_dump(exclude_unset=True))


@router.delete("/{document_id}", status_code=status.HTTP_200_OK)
async def delete_document(
    document_id: UUID,
    user: User = Depends(get_current_user_entity),
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, str]:
    """Delete a document."""
    service = DocumentService(session=session, settings=get_settings())
    await service.delete_document(user, document_id)
    return {"status": "ok"}


@router.get("/{document_id}/content")
async def document_content(
    document_id: UUID,
    user: User = Depends(get_current_user_entity),
    session: AsyncSession = Depends(get_db_session),
):
    """Get the raw PDF content for a document."""
    from fastapi.responses import FileResponse
    service = DocumentService(session=session, settings=get_settings())
    document = await service.get_document(user, document_id)
    return FileResponse(
        path=document.file_path,
        media_type="application/pdf",
        filename=f"{document.title or document.id}.pdf"
    )
