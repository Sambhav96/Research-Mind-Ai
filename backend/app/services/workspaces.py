"""Workspace service."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.models.user import User
from app.models.workspace import Workspace
from app.repositories.workspace import WorkspaceRepository
from app.schemas.workspaces import WorkspaceCreate, WorkspaceListResponse, WorkspaceResponse, WorkspaceUpdate


class WorkspaceService:
    """Service for managing workspaces."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repo = WorkspaceRepository(session)

    async def create_workspace(self, owner: User, data: WorkspaceCreate) -> WorkspaceResponse:
        """Create a new workspace."""
        workspace = Workspace(
            owner_id=owner.id,
            name=data.name,
            description=data.description,
            color=data.color,
            paper_count=0,
        )
        await self._repo.create(workspace)
        await self._session.commit()
        return self._to_response(workspace)

    async def list_workspaces(self, owner: User) -> WorkspaceListResponse:
        """List workspaces for the current user."""
        from app.models.document import Document
        from sqlalchemy import select, func

        workspaces = await self._repo.list_by_owner(owner.id)

        stmt = select(
            Document.workspace_id,
            func.count(Document.id)
        ).where(
            Document.owner_id == owner.id,
            Document.workspace_id.isnot(None),
            Document.is_deleted.is_(False)
        ).group_by(Document.workspace_id)

        result = await self._session.execute(stmt)
        counts = {ws_id: count for ws_id, count in result.all()}

        responses = []
        for ws in workspaces:
            resp = self._to_response(ws)
            resp.paper_count = counts.get(ws.id, 0)
            responses.append(resp)

        return WorkspaceListResponse(items=responses)

    async def get_workspace(self, owner: User, workspace_id: UUID) -> WorkspaceResponse:
        """Get a specific workspace."""
        workspace = await self._repo.get_by_id_for_owner(workspace_id, owner.id)
        if not workspace:
            raise AppError(code="workspace_not_found", message="Workspace not found", status_code=404)

        from app.models.document import Document
        from sqlalchemy import select, func
        stmt = select(func.count(Document.id)).where(
            Document.workspace_id == workspace_id,
            Document.is_deleted.is_(False)
        )
        doc_count = (await self._session.execute(stmt)).scalar_one_or_none() or 0

        resp = self._to_response(workspace)
        resp.paper_count = doc_count
        return resp

    async def update_workspace(self, owner: User, workspace_id: UUID, data: WorkspaceUpdate) -> WorkspaceResponse:
        """Update a workspace."""
        workspace = await self._repo.get_by_id_for_owner(workspace_id, owner.id)
        if not workspace:
            raise AppError(code="workspace_not_found", message="Workspace not found", status_code=404)

        if data.name is not None:
            workspace.name = data.name
        if data.description is not None:
            workspace.description = data.description
        if data.color is not None:
            workspace.color = data.color

        await self._repo.update(workspace)
        await self._session.commit()

        # Dynamic count
        from app.models.document import Document
        from sqlalchemy import select, func
        stmt = select(func.count(Document.id)).where(
            Document.workspace_id == workspace_id,
            Document.is_deleted.is_(False)
        )
        doc_count = (await self._session.execute(stmt)).scalar_one_or_none() or 0

        resp = self._to_response(workspace)
        resp.paper_count = doc_count
        return resp

    async def get_workspace_activity(self, owner: User, workspace_id: UUID) -> dict[str, int]:
        from sqlalchemy import select, func
        from app.models.document import Document
        from app.models.flashcard import FlashcardDeck
        from app.models.quiz import QuizSet
        from app.models.chat_session import ChatSession

        # Verify workspace exists and belongs to user
        import asyncio
        workspace = await self._repo.get_by_id_for_owner(workspace_id, owner.id)
        if not workspace:
            from app.core.errors import AppError
            raise AppError(code="workspace_not_found", message="Workspace not found", status_code=404)

        # 1. Count documents
        doc_count_stmt = select(func.count(Document.id)).where(
            Document.workspace_id == workspace_id,
            Document.owner_id == owner.id,
            Document.is_deleted.is_(False)
        )
        
        # Get list of doc IDs to filter other entities
        docs_stmt = select(Document.id).where(
            Document.workspace_id == workspace_id,
            Document.owner_id == owner.id,
            Document.is_deleted.is_(False)
        )
        
        # Chat sessions statement
        chat_stmt = select(ChatSession.selected_document_ids).where(
            ChatSession.owner_id == owner.id
        )

        # Execute queries concurrently where possible
        doc_count_task = await self._session.execute(doc_count_stmt)
        doc_ids_task = await self._session.execute(docs_stmt)
        chat_results_task = await self._session.execute(chat_stmt)

        doc_count = doc_count_task.scalar_one_or_none() or 0
        doc_ids = doc_ids_task.scalars().all()
        chat_results = chat_results_task.scalars().all()

        if not doc_ids:
            fc_count = 0
            quiz_count = 0
        else:
            # 2. Count FlashcardDecks
            fc_stmt = select(func.count(FlashcardDeck.id)).where(
                FlashcardDeck.document_id.in_(doc_ids)
            )

            # 3. Count Quizzes
            quiz_stmt = select(func.count(QuizSet.id)).where(
                QuizSet.document_id.in_(doc_ids)
            )
            
            fc_count_task = await self._session.execute(fc_stmt)
            quiz_count_task = await self._session.execute(quiz_stmt)
            fc_count = fc_count_task.scalar_one_or_none() or 0
            quiz_count = quiz_count_task.scalar_one_or_none() or 0

        # 4. Count Chat Sessions
        # Chat sessions can be tied to a document or have it in selected_document_ids.
        # Simple approximation: chats that have any of these documents in their selected_document_ids
        chat_count = 0
        doc_id_strs = {str(d) for d in doc_ids}
        for selected in chat_results:
            if selected and any(str(doc_id) in selected for doc_id in doc_id_strs):
                chat_count += 1
            # If selected_document_ids is empty/null, it means "all documents". We can optionally count it.
            elif not selected:
                chat_count += 1

        return {
            "documents": doc_count,
            "flashcards": fc_count,
            "quizzes": quiz_count,
            "chats": chat_count
        }

    async def delete_workspace(self, owner: User, workspace_id: UUID) -> None:
        """Delete a workspace."""
        workspace = await self._repo.get_by_id_for_owner(workspace_id, owner.id)
        if not workspace:
            raise AppError(code="workspace_not_found", message="Workspace not found", status_code=404)

        await self._repo.mark_deleted(workspace)
        await self._session.commit()

    def _to_response(self, workspace: Workspace) -> WorkspaceResponse:
        return WorkspaceResponse(
            id=workspace.id,
            owner_id=workspace.owner_id,
            name=workspace.name,
            description=workspace.description,
            color=workspace.color,
            paper_count=workspace.paper_count,
            created_at=workspace.created_at,
            updated_at=workspace.updated_at,
        )
