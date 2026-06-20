from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
from uuid import UUID

class WorkspaceAdminList(BaseModel):
    id: UUID
    name: str
    owner_id: UUID
    owner_name: Optional[str]
    owner_email: str
    documents_count: int
    notes_count: int
    flashcards_count: int
    quizzes_count: int
    created_at: datetime

    class Config:
        from_attributes = True

class SimpleDocumentItem(BaseModel):
    id: UUID
    title: str
    file_size: int
    status: str
    created_at: datetime

class SimpleNoteItem(BaseModel):
    id: UUID
    title: str
    created_at: datetime

class SimpleFlashcardDeckItem(BaseModel):
    id: UUID
    document_name: Optional[str]
    card_count: int
    created_at: datetime

class SimpleQuizSetItem(BaseModel):
    id: UUID
    title: Optional[str]
    document_name: Optional[str]
    question_count: int
    created_at: datetime

class WorkspaceAdminDetail(BaseModel):
    id: UUID
    name: str
    owner_id: UUID
    owner_name: Optional[str]
    owner_email: str
    description: Optional[str]
    color: str
    created_at: datetime
    
    documents: List[SimpleDocumentItem]
    notes: List[SimpleNoteItem]
    flashcards: List[SimpleFlashcardDeckItem]
    quizzes: List[SimpleQuizSetItem]
    
    class Config:
        from_attributes = True

class WorkspaceStatsItem(BaseModel):
    id: UUID
    name: str
    owner_name: Optional[str]
    owner_email: str
    value: int

class WorkspaceAdminStats(BaseModel):
    total_workspaces: int
    most_active: List[WorkspaceStatsItem]
    largest: List[WorkspaceStatsItem]
    recently_created: List[WorkspaceStatsItem]
