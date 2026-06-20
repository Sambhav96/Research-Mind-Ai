"""Workspace API routes."""

from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.models.user import User
from app.schemas.workspaces import WorkspaceCreate, WorkspaceListResponse, WorkspaceResponse, WorkspaceUpdate
from app.services.auth import get_current_user_entity
from app.services.workspaces import WorkspaceService

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


@router.post("", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
async def create_workspace(
    data: WorkspaceCreate,
    user: User = Depends(get_current_user_entity),
    session: AsyncSession = Depends(get_db_session),
) -> WorkspaceResponse:
    """Create a new workspace."""
    service = WorkspaceService(session)
    return await service.create_workspace(user, data)


@router.get("", response_model=WorkspaceListResponse)
async def list_workspaces(
    user: User = Depends(get_current_user_entity),
    session: AsyncSession = Depends(get_db_session),
) -> WorkspaceListResponse:
    """List workspaces for current user."""
    service = WorkspaceService(session)
    return await service.list_workspaces(user)


@router.get("/{workspace_id}", response_model=WorkspaceResponse)
async def get_workspace(
    workspace_id: UUID,
    user: User = Depends(get_current_user_entity),
    session: AsyncSession = Depends(get_db_session),
) -> WorkspaceResponse:
    """Get a specific workspace."""
    service = WorkspaceService(session)
    return await service.get_workspace(user, workspace_id)


@router.put("/{workspace_id}", response_model=WorkspaceResponse)
async def update_workspace(
    workspace_id: UUID,
    data: WorkspaceUpdate,
    user: User = Depends(get_current_user_entity),
    session: AsyncSession = Depends(get_db_session),
) -> WorkspaceResponse:
    """Update a workspace."""
    service = WorkspaceService(session)
    return await service.update_workspace(user, workspace_id, data)

from app.schemas.documents import DocumentListResponse
from app.services.documents import DocumentService
from app.schemas.workspaces import WorkspaceActivityResponse
from app.core.config import get_settings

@router.get("/{workspace_id}/documents", response_model=DocumentListResponse)
async def get_workspace_documents(
    workspace_id: UUID,
    user: User = Depends(get_current_user_entity),
    session: AsyncSession = Depends(get_db_session),
) -> DocumentListResponse:
    """Get all documents in a workspace."""
    service = DocumentService(session=session, settings=get_settings())
    return await service.list_by_workspace(user, workspace_id)

@router.get("/{workspace_id}/activity", response_model=WorkspaceActivityResponse)
async def get_workspace_activity(
    workspace_id: UUID,
    user: User = Depends(get_current_user_entity),
    session: AsyncSession = Depends(get_db_session),
) -> WorkspaceActivityResponse:
    """Get activity summary for a workspace."""
    service = WorkspaceService(session)
    data = await service.get_workspace_activity(user, workspace_id)
    return WorkspaceActivityResponse(**data)


@router.delete("/{workspace_id}", status_code=status.HTTP_200_OK)
async def delete_workspace(
    workspace_id: UUID,
    user: User = Depends(get_current_user_entity),
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, str]:
    """Delete a workspace."""
    service = WorkspaceService(session)
    await service.delete_workspace(user, workspace_id)
    return {"status": "ok"}
