"""Quiz models."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import ForeignKey, String, Text, Integer, Boolean
from sqlalchemy.dialects.postgresql import UUID as PGUUID, JSONB, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class QuizSet(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Quiz Set ORM model."""

    __tablename__ = "quiz_sets"

    owner_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    document_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    document_name: Mapped[str | None] = mapped_column(String(256), nullable=True)
    title: Mapped[str | None] = mapped_column(String(256), nullable=True)
    selected_document_ids: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    question_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_favorite: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    questions: Mapped[list["QuizQuestion"]] = relationship(
        "QuizQuestion", back_populates="quiz_set", cascade="all, delete-orphan", lazy="selectin"
    )
    attempts: Mapped[list["QuizAttempt"]] = relationship(
        "QuizAttempt", back_populates="quiz_set", cascade="all, delete-orphan"
    )


class QuizQuestion(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Quiz Question ORM model."""

    __tablename__ = "quiz_questions"

    quiz_set_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("quiz_sets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    question: Mapped[str] = mapped_column(Text, nullable=False)
    options: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False)
    correct_answer: Mapped[int] = mapped_column(Integer, nullable=False)
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    topic: Mapped[str | None] = mapped_column(String(256), nullable=True)

    quiz_set: Mapped["QuizSet"] = relationship("QuizSet", back_populates="questions")


class QuizAttempt(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Quiz Attempt ORM model."""

    __tablename__ = "quiz_attempts"

    quiz_set_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("quiz_sets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    percentage: Mapped[int] = mapped_column(Integer, nullable=False)
    
    quiz_set: Mapped["QuizSet"] = relationship("QuizSet", back_populates="attempts")
