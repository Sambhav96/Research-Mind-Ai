"""Admin User Management Schemas."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class AdminUserListItem(BaseModel):
    """Schema for a user item in the admin list view."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    name: str | None
    plan: str
    is_active: bool
    is_verified: bool
    created_at: datetime
    last_login_at: datetime | None
    document_count: int
    research_score: int


class AdminUserListResponse(BaseModel):
    """Schema for paginated user list."""
    users: list[AdminUserListItem]
    total: int
    page: int
    size: int


class UserActivityStats(BaseModel):
    """Schema for detailed user activity stats."""
    workspaces_count: int
    documents_count: int
    flashcards_count: int
    quizzes_count: int
    notes_count: int
    chats_count: int


class UserActivityHistoryItem(BaseModel):
    """Schema for a single timeline event."""
    id: str
    type: str  # document, workspace, quiz, flashcard, note
    title: str
    created_at: datetime


class AdminUserDetailResponse(BaseModel):
    """Schema for the detailed user view."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    name: str | None
    plan: str
    is_active: bool
    is_verified: bool
    created_at: datetime
    last_login_at: datetime | None
    research_score: int
    
    stats: UserActivityStats
    recent_activity: list[UserActivityHistoryItem]
