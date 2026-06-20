"""Workspace repository."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.workspace import Workspace


class WorkspaceRepository:
    """Data access for workspaces."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, workspace: Workspace) -> Workspace:
        """Create a workspace record."""
        self._session.add(workspace)
        await self._session.flush()
        return workspace

    async def list_by_owner(self, owner_id: UUID) -> list[Workspace]:
        """List workspaces for an owner."""
        result = await self._session.execute(
            select(Workspace)
            .where(Workspace.owner_id == owner_id, Workspace.is_deleted.is_(False))
            .order_by(Workspace.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_by_id_for_owner(self, workspace_id: UUID, owner_id: UUID) -> Workspace | None:
        """Fetch a workspace by id for an owner."""
        result = await self._session.execute(
            select(Workspace).where(
                Workspace.id == workspace_id,
                Workspace.owner_id == owner_id,
                Workspace.is_deleted.is_(False),
            )
        )
        return result.scalar_one_or_none()

    async def mark_deleted(self, workspace: Workspace) -> None:
        """Mark a workspace as deleted."""
        workspace.soft_delete()
        await self._session.flush()

    async def update(self, workspace: Workspace) -> Workspace:
        """Update a workspace."""
        await self._session.flush()
        return workspace
