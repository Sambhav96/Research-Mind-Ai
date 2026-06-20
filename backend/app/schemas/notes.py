"""Notes schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class NoteCreate(BaseModel):
    title: str
    content: str
    workspace_id: UUID | None = None
    document_id: UUID | None = None


class NoteUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    workspace_id: UUID | None = None
    document_id: UUID | None = None


class NoteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    workspace_id: UUID | None
    document_id: UUID | None
    title: str
    content: str
    created_at: datetime
    updated_at: datetime


class GenerateNotesRequest(BaseModel):
    document_ids: list[UUID] | None = None
    workspace_id: UUID | None = None

