import asyncio
from uuid import UUID
from typing import List

from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.models.user import User
from app.models.workspace import Workspace
from app.models.document import Document
from app.models.note import Note
from app.models.flashcard import FlashcardDeck
from app.models.quiz import QuizSet

class AdminWorkspaceService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_workspaces(self) -> List[dict]:
        stmt = select(
            Workspace,
            User.name.label("owner_name"),
            User.email.label("owner_email")
        ).join(User, Workspace.owner_id == User.id).where(Workspace.is_deleted.is_(False)).order_by(desc(Workspace.created_at))

        result = await self._session.execute(stmt)
        workspaces_data = result.all()

        if not workspaces_data:
            return []

        # Get counts for all workspaces
        ws_ids = [row[0].id for row in workspaces_data]
        
        # Documents count
        doc_stmt = select(Document.workspace_id, func.count(Document.id)).where(
            Document.workspace_id.in_(ws_ids),
            Document.is_deleted.is_(False)
        ).group_by(Document.workspace_id)
        
        # Notes count
        note_stmt = select(Note.workspace_id, func.count(Note.id)).where(
            Note.workspace_id.in_(ws_ids)
        ).group_by(Note.workspace_id)

        doc_result = await self._session.execute(doc_stmt)
        note_result = await self._session.execute(note_stmt)
        
        doc_counts = {row[0]: row[1] for row in doc_result}
        note_counts = {row[0]: row[1] for row in note_result}

        # For flashcards and quizzes, we need to map workspace -> docs -> flashcards
        doc_list_stmt = select(Document.id, Document.workspace_id).where(
            Document.workspace_id.in_(ws_ids),
            Document.is_deleted.is_(False)
        )
        doc_list_result = await self._session.execute(doc_list_stmt)
        
        doc_to_ws = {row[0]: row[1] for row in doc_list_result}
        doc_ids = list(doc_to_ws.keys())

        fc_counts = {ws_id: 0 for ws_id in ws_ids}
        quiz_counts = {ws_id: 0 for ws_id in ws_ids}

        if doc_ids:
            fc_stmt = select(FlashcardDeck.document_id, func.count(FlashcardDeck.id)).where(
                FlashcardDeck.document_id.in_(doc_ids)
            ).group_by(FlashcardDeck.document_id)
            
            quiz_stmt = select(QuizSet.document_id, func.count(QuizSet.id)).where(
                QuizSet.document_id.in_(doc_ids)
            ).group_by(QuizSet.document_id)
            
            fc_res = await self._session.execute(fc_stmt)
            quiz_res = await self._session.execute(quiz_stmt)
            
            for doc_id, count in fc_res:
                ws_id = doc_to_ws.get(doc_id)
                if ws_id:
                    fc_counts[ws_id] += count
                    
            for doc_id, count in quiz_res:
                ws_id = doc_to_ws.get(doc_id)
                if ws_id:
                    quiz_counts[ws_id] += count

        response = []
        for ws, owner_name, owner_email in workspaces_data:
            response.append({
                "id": ws.id,
                "name": ws.name,
                "owner_id": ws.owner_id,
                "owner_name": owner_name,
                "owner_email": owner_email,
                "documents_count": doc_counts.get(ws.id, 0),
                "notes_count": note_counts.get(ws.id, 0),
                "flashcards_count": fc_counts.get(ws.id, 0),
                "quizzes_count": quiz_counts.get(ws.id, 0),
                "created_at": ws.created_at
            })

        return response

    async def get_workspace_detail(self, workspace_id: UUID) -> dict:
        stmt = select(
            Workspace,
            User.name.label("owner_name"),
            User.email.label("owner_email")
        ).join(User, Workspace.owner_id == User.id).where(
            Workspace.id == workspace_id,
            Workspace.is_deleted.is_(False)
        )
        
        result = await self._session.execute(stmt)
        row = result.first()
        
        if not row:
            raise AppError(code="workspace_not_found", message="Workspace not found", status_code=404)
            
        ws, owner_name, owner_email = row

        # Get documents
        docs_stmt = select(Document).where(
            Document.workspace_id == workspace_id,
            Document.is_deleted.is_(False)
        ).order_by(desc(Document.created_at))
        
        # Get notes
        notes_stmt = select(Note).where(
            Note.workspace_id == workspace_id
        ).order_by(desc(Note.created_at))
        
        docs_result = await self._session.execute(docs_stmt)
        notes_result = await self._session.execute(notes_stmt)
        
        docs = docs_result.scalars().all()
        notes = notes_result.scalars().all()
        
        doc_ids = [d.id for d in docs]
        
        flashcards = []
        quizzes = []
        if doc_ids:
            fc_stmt = select(FlashcardDeck).where(
                FlashcardDeck.document_id.in_(doc_ids)
            ).order_by(desc(FlashcardDeck.created_at))
            
            quiz_stmt = select(QuizSet).where(
                QuizSet.document_id.in_(doc_ids)
            ).order_by(desc(QuizSet.created_at))
            
            fc_res = await self._session.execute(fc_stmt)
            quiz_res = await self._session.execute(quiz_stmt)
            flashcards = fc_res.scalars().all()
            quizzes = quiz_res.scalars().all()

        return {
            "id": ws.id,
            "name": ws.name,
            "owner_id": ws.owner_id,
            "owner_name": owner_name,
            "owner_email": owner_email,
            "description": ws.description,
            "color": ws.color,
            "created_at": ws.created_at,
            "documents": [
                {
                    "id": d.id,
                    "title": d.title,
                    "file_size": d.file_size,
                    "status": d.status,
                    "created_at": d.created_at
                } for d in docs
            ],
            "notes": [
                {
                    "id": n.id,
                    "title": n.title,
                    "created_at": n.created_at
                } for n in notes
            ],
            "flashcards": [
                {
                    "id": f.id,
                    "document_name": f.document_name,
                    "card_count": f.card_count,
                    "created_at": f.created_at
                } for f in flashcards
            ],
            "quizzes": [
                {
                    "id": q.id,
                    "title": q.title,
                    "document_name": q.document_name,
                    "question_count": q.question_count,
                    "created_at": q.created_at
                } for q in quizzes
            ]
        }

    async def get_workspace_stats(self) -> dict:
        workspaces = await self.list_workspaces()
        total_workspaces = len(workspaces)
        
        if not workspaces:
            return {
                "total_workspaces": 0,
                "most_active": [],
                "largest": [],
                "recently_created": []
            }
            
        # Most active: by sum of notes + flashcards + quizzes
        sorted_active = sorted(
            workspaces, 
            key=lambda w: w["notes_count"] + w["flashcards_count"] + w["quizzes_count"], 
            reverse=True
        )[:5]
        
        most_active = [
            {
                "id": w["id"], 
                "name": w["name"], 
                "owner_name": w["owner_name"], 
                "owner_email": w["owner_email"], 
                "value": w["notes_count"] + w["flashcards_count"] + w["quizzes_count"]
            }
            for w in sorted_active if (w["notes_count"] + w["flashcards_count"] + w["quizzes_count"]) > 0
        ]
        
        # Largest: by document count
        sorted_largest = sorted(
            workspaces, 
            key=lambda w: w["documents_count"], 
            reverse=True
        )[:5]
        
        largest = [
            {
                "id": w["id"], 
                "name": w["name"], 
                "owner_name": w["owner_name"], 
                "owner_email": w["owner_email"], 
                "value": w["documents_count"]
            }
            for w in sorted_largest if w["documents_count"] > 0
        ]
        
        # Recently created
        sorted_recent = sorted(
            workspaces,
            key=lambda w: w["created_at"],
            reverse=True
        )[:5]
        
        recently_created = [
            {
                "id": w["id"], 
                "name": w["name"], 
                "owner_name": w["owner_name"], 
                "owner_email": w["owner_email"], 
                "value": 0  # Not applicable
            }
            for w in sorted_recent
        ]

        return {
            "total_workspaces": total_workspaces,
            "most_active": most_active,
            "largest": largest,
            "recently_created": recently_created
        }

    async def delete_workspace(self, workspace_id: UUID) -> None:
        stmt = select(Workspace).where(
            Workspace.id == workspace_id,
            Workspace.is_deleted.is_(False)
        )
        result = await self._session.execute(stmt)
        workspace = result.scalar_one_or_none()
        
        if not workspace:
            raise AppError(code="workspace_not_found", message="Workspace not found", status_code=404)
            
        workspace.is_deleted = True
        
        # Unlink documents from workspace instead of deleting them (same behavior as user-side)
        docs_stmt = select(Document).where(Document.workspace_id == workspace_id)
        docs_result = await self._session.execute(docs_stmt)
        for doc in docs_result.scalars().all():
            doc.workspace_id = None
            
        await self._session.commit()
