"""Notes routes."""

from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.models.user import User
from app.models.note import Note
from app.schemas.notes import NoteCreate, NoteUpdate, NoteResponse, GenerateNotesRequest
from app.services.auth import get_current_user_entity
from app.services.notes_generator import NotesGeneratorService

router = APIRouter(prefix="/notes", tags=["notes"])


@router.post("/generate", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
async def generate_notes(
    body: GenerateNotesRequest,
    user: User = Depends(get_current_user_entity),
    session: AsyncSession = Depends(get_db_session),
) -> Any:
    """Generate structured AI notes from documents."""
    generator = NotesGeneratorService(session)
    note = await generator.generate_notes(
        user_id=user.id,
        document_ids=body.document_ids,
        workspace_id=body.workspace_id,
    )
    return note


@router.get("", response_model=list[NoteResponse])
async def list_notes(
    user: User = Depends(get_current_user_entity),
    session: AsyncSession = Depends(get_db_session),
) -> Any:
    """Retrieve all notes for the current user."""
    stmt = select(Note).where(Note.user_id == user.id).order_by(desc(Note.created_at))
    result = await session.execute(stmt)
    notes = result.scalars().all()
    return notes


@router.post("", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
async def create_note(
    body: NoteCreate,
    user: User = Depends(get_current_user_entity),
    session: AsyncSession = Depends(get_db_session),
) -> Any:
    """Create a new manual note."""
    note = Note(
        user_id=user.id,
        workspace_id=body.workspace_id,
        document_id=body.document_id,
        title=body.title,
        content=body.content,
    )
    session.add(note)
    await session.commit()
    await session.refresh(note)
    return note


@router.get("/{note_id}", response_model=NoteResponse)
async def get_note(
    note_id: uuid.UUID,
    user: User = Depends(get_current_user_entity),
    session: AsyncSession = Depends(get_db_session),
) -> Any:
    """Get a specific note by ID."""
    stmt = select(Note).where(Note.id == note_id, Note.user_id == user.id)
    result = await session.execute(stmt)
    note = result.scalars().first()
    
    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found",
        )
    return note


@router.patch("/{note_id}", response_model=NoteResponse)
async def update_note(
    note_id: uuid.UUID,
    body: NoteUpdate,
    user: User = Depends(get_current_user_entity),
    session: AsyncSession = Depends(get_db_session),
) -> Any:
    """Update an existing note."""
    stmt = select(Note).where(Note.id == note_id, Note.user_id == user.id)
    result = await session.execute(stmt)
    note = result.scalars().first()
    
    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found",
        )
    
    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(note, key, value)
        
    session.add(note)
    await session.commit()
    await session.refresh(note)
    return note


@router.delete("/{note_id}", status_code=status.HTTP_200_OK)
async def delete_note(
    note_id: uuid.UUID,
    user: User = Depends(get_current_user_entity),
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, str]:
    """Delete a note."""
    stmt = select(Note).where(Note.id == note_id, Note.user_id == user.id)
    result = await session.execute(stmt)
    note = result.scalars().first()
    
    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found",
        )
        
    await session.delete(note)
    await session.commit()
    
    return {"status": "ok"}
