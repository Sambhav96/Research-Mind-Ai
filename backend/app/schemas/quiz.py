"""Quiz schemas."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class QuizQuestionResponse(BaseModel):
    """Quiz Question response."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    quiz_set_id: UUID
    question: str
    options: list[str]
    correct_answer: int
    explanation: str | None = None
    topic: str | None = None


class QuizSetResponse(BaseModel):
    """Quiz Set response."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    owner_id: UUID
    document_id: UUID | None = None
    document_name: str | None = None
    selected_document_ids: list[str] | None = None
    title: str | None = None
    question_count: int
    created_at: datetime
    updated_at: datetime
    best_score: int | None = None
    last_score: int | None = None
    attempt_count: int = 0
    is_favorite: bool = False


class QuizAttemptCreate(BaseModel):
    """Request body for creating a quiz attempt."""

    score: int
    percentage: int


class QuizAttemptResponse(BaseModel):
    """Response for a quiz attempt."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    quiz_set_id: UUID
    score: int
    percentage: int
    created_at: datetime


class QuizSetDetailResponse(QuizSetResponse):
    """Quiz Set response with questions."""

    questions: list[QuizQuestionResponse]


class QuizSetUpdateRequest(BaseModel):
    """Request body for updating a Quiz Set."""

    title: str | None = None
    is_favorite: bool | None = None


class AdaptiveQuizRequest(BaseModel):
    """Request body for creating an adaptive quiz."""

    question_ids: list[UUID]

class QuizAnalyticsResponse(BaseModel):
    """Quiz Analytics response."""
    
    generated: int
    attempted: int
    average_score: float | None = None
    best_score: int | None = None
    completion_rate: float
