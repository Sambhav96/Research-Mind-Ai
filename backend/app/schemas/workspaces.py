"""Workspace schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class WorkspaceBase(BaseModel):
    """Base workspace schema."""

    name: str = Field(..., max_length=128)
    description: str | None = Field(None, max_length=1000)
    color: str = Field(default="#6366f1", max_length=32)


class WorkspaceCreate(WorkspaceBase):
    """Schema for creating a workspace."""
    pass


class WorkspaceUpdate(BaseModel):
    """Schema for updating a workspace."""

    name: str | None = Field(None, max_length=128)
    description: str | None = Field(None, max_length=1000)
    color: str | None = Field(None, max_length=32)


class WorkspaceResponse(WorkspaceBase):
    """Schema for workspace response."""

    id: UUID
    owner_id: UUID
    paper_count: int
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class WorkspaceListResponse(BaseModel):
    """Schema for listing workspaces."""

    items: list[WorkspaceResponse]


class WorkspaceActivityResponse(BaseModel):
    """Schema for workspace activity metrics."""

    documents: int
    flashcards: int
    quizzes: int
    chats: int
