from typing import List, Optional
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel

# Flashcards

class AdminFlashcardStats(BaseModel):
    total_decks: int
    total_cards: int
    most_used_decks: List[dict]  # e.g., [{"id": ..., "name": ..., "card_count": ...}]

class AdminFlashcardDeckList(BaseModel):
    id: UUID
    owner_id: UUID
    owner_name: Optional[str]
    owner_email: str
    document_id: Optional[UUID]
    document_name: Optional[str]
    card_count: int
    created_at: datetime

class AdminFlashcardDetail(BaseModel):
    id: UUID
    question: str
    answer: str

class AdminFlashcardDeckDetail(AdminFlashcardDeckList):
    cards: List[AdminFlashcardDetail]

# Quizzes

class AdminQuizStats(BaseModel):
    total_quizzes: int
    completion_rate: float
    average_score: float

class AdminQuizList(BaseModel):
    id: UUID
    owner_id: UUID
    owner_name: Optional[str]
    owner_email: str
    document_id: Optional[UUID]
    document_name: Optional[str]
    title: Optional[str]
    question_count: int
    attempts_count: int
    created_at: datetime

class AdminQuizQuestionDetail(BaseModel):
    id: UUID
    question: str
    options: List[str]
    correct_answer: int
    explanation: Optional[str]

class AdminQuizDetail(AdminQuizList):
    questions: List[AdminQuizQuestionDetail]

# Notes

class AdminNoteStats(BaseModel):
    manual_notes: int
    ai_notes: int
    most_active_users: List[dict]  # [{"id": ..., "name": ..., "note_count": ...}]

class AdminNoteList(BaseModel):
    id: UUID
    owner_id: UUID
    owner_name: Optional[str]
    owner_email: str
    workspace_id: Optional[UUID]
    document_id: Optional[UUID]
    title: str
    content: str
    is_ai_generated: bool
    created_at: datetime

# Overall Stats
class AdminContentStatsResponse(BaseModel):
    flashcards: AdminFlashcardStats
    quizzes: AdminQuizStats
    notes: AdminNoteStats
