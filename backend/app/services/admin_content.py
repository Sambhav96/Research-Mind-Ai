from typing import List, Dict, Any
from uuid import UUID
import asyncio

from sqlalchemy import select, func, desc, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.models.user import User
from app.models.flashcard import FlashcardDeck, Flashcard
from app.models.quiz import QuizSet, QuizQuestion, QuizAttempt
from app.models.note import Note

class AdminContentService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_content_stats(self) -> Dict[str, Any]:
        # Flashcard Stats
        fc_decks_count_stmt = select(func.count(FlashcardDeck.id))
        fc_cards_count_stmt = select(func.sum(FlashcardDeck.card_count))
        
        # Most Used Decks = Decks with most cards for simplicity, since we lack direct usage metrics
        most_used_decks_stmt = select(
            FlashcardDeck.id,
            FlashcardDeck.document_name,
            FlashcardDeck.card_count
        ).order_by(desc(FlashcardDeck.card_count)).limit(5)

        # Quiz Stats
        quiz_count_stmt = select(func.count(QuizSet.id))
        quiz_attempted_stmt = select(func.count(func.distinct(QuizAttempt.quiz_set_id)))
        quiz_avg_score_stmt = select(func.avg(QuizAttempt.percentage))

        # Note Stats
        manual_notes_stmt = select(func.count(Note.id)).where(Note.title.notlike('AI Notes:%'))
        ai_notes_stmt = select(func.count(Note.id)).where(Note.title.like('AI Notes:%'))
        
        most_active_users_stmt = select(
            User.id,
            User.name,
            func.count(Note.id).label("note_count")
        ).join(Note, Note.user_id == User.id).group_by(User.id, User.name).order_by(desc("note_count")).limit(5)

        fc_decks_count = await self._session.scalar(fc_decks_count_stmt)
        fc_cards_count = await self._session.scalar(fc_cards_count_stmt)
        most_used_decks_res = await self._session.execute(most_used_decks_stmt)
        quiz_count = await self._session.scalar(quiz_count_stmt)
        quiz_attempted_count = await self._session.scalar(quiz_attempted_stmt)
        quiz_avg_score = await self._session.scalar(quiz_avg_score_stmt)
        manual_notes = await self._session.scalar(manual_notes_stmt)
        ai_notes = await self._session.scalar(ai_notes_stmt)
        most_active_users_res = await self._session.execute(most_active_users_stmt)

        fc_decks_count = fc_decks_count or 0
        fc_cards_count = fc_cards_count or 0
        quiz_count = quiz_count or 0
        quiz_attempted_count = quiz_attempted_count or 0
        quiz_avg_score = quiz_avg_score or 0.0
        manual_notes = manual_notes or 0
        ai_notes = ai_notes or 0

        # Completion Rate = quizzes with at least 1 attempt / total quizzes
        completion_rate = (quiz_attempted_count / quiz_count * 100) if quiz_count > 0 else 0.0

        most_used_decks = [
            {"id": row[0], "name": row[1] or "Untitled Deck", "card_count": row[2]}
            for row in most_used_decks_res
        ]

        most_active_users = [
            {"id": row[0], "name": row[1] or "Unknown User", "note_count": row[2]}
            for row in most_active_users_res
        ]

        return {
            "flashcards": {
                "total_decks": fc_decks_count,
                "total_cards": int(fc_cards_count),
                "most_used_decks": most_used_decks
            },
            "quizzes": {
                "total_quizzes": quiz_count,
                "completion_rate": completion_rate,
                "average_score": float(quiz_avg_score)
            },
            "notes": {
                "manual_notes": manual_notes,
                "ai_notes": ai_notes,
                "most_active_users": most_active_users
            }
        }

    async def list_flashcard_decks(self) -> List[Dict[str, Any]]:
        stmt = select(
            FlashcardDeck,
            User.name.label("owner_name"),
            User.email.label("owner_email")
        ).join(User, FlashcardDeck.owner_id == User.id).order_by(desc(FlashcardDeck.created_at))

        result = await self._session.execute(stmt)
        decks = []
        for deck, owner_name, owner_email in result:
            decks.append({
                "id": deck.id,
                "owner_id": deck.owner_id,
                "owner_name": owner_name,
                "owner_email": owner_email,
                "document_id": deck.document_id,
                "document_name": deck.document_name,
                "card_count": deck.card_count,
                "created_at": deck.created_at
            })
        return decks

    async def get_flashcard_deck(self, deck_id: UUID) -> Dict[str, Any]:
        stmt = select(
            FlashcardDeck,
            User.name.label("owner_name"),
            User.email.label("owner_email")
        ).join(User, FlashcardDeck.owner_id == User.id).where(FlashcardDeck.id == deck_id)

        result = await self._session.execute(stmt)
        row = result.first()
        if not row:
            raise AppError(code="deck_not_found", message="Deck not found", status_code=404)
        
        deck, owner_name, owner_email = row

        cards_stmt = select(Flashcard).where(Flashcard.deck_id == deck_id).order_by(Flashcard.order_index)
        cards_result = await self._session.execute(cards_stmt)
        cards = cards_result.scalars().all()

        return {
            "id": deck.id,
            "owner_id": deck.owner_id,
            "owner_name": owner_name,
            "owner_email": owner_email,
            "document_id": deck.document_id,
            "document_name": deck.document_name,
            "card_count": deck.card_count,
            "created_at": deck.created_at,
            "cards": [
                {
                    "id": c.id,
                    "question": c.question,
                    "answer": c.answer
                } for c in cards
            ]
        }

    async def list_quizzes(self) -> List[Dict[str, Any]]:
        stmt = select(
            QuizSet,
            User.name.label("owner_name"),
            User.email.label("owner_email"),
            func.count(QuizAttempt.id).label("attempts_count")
        ).join(User, QuizSet.owner_id == User.id).outerjoin(
            QuizAttempt, QuizAttempt.quiz_set_id == QuizSet.id
        ).group_by(QuizSet.id, User.name, User.email).order_by(desc(QuizSet.created_at))

        result = await self._session.execute(stmt)
        quizzes = []
        for quiz, owner_name, owner_email, attempts_count in result:
            quizzes.append({
                "id": quiz.id,
                "owner_id": quiz.owner_id,
                "owner_name": owner_name,
                "owner_email": owner_email,
                "document_id": quiz.document_id,
                "document_name": quiz.document_name,
                "title": quiz.title,
                "question_count": quiz.question_count,
                "attempts_count": attempts_count,
                "created_at": quiz.created_at
            })
        return quizzes

    async def get_quiz(self, quiz_id: UUID) -> Dict[str, Any]:
        stmt = select(
            QuizSet,
            User.name.label("owner_name"),
            User.email.label("owner_email"),
            func.count(QuizAttempt.id).label("attempts_count")
        ).join(User, QuizSet.owner_id == User.id).outerjoin(
            QuizAttempt, QuizAttempt.quiz_set_id == QuizSet.id
        ).where(QuizSet.id == quiz_id).group_by(QuizSet.id, User.name, User.email)

        result = await self._session.execute(stmt)
        row = result.first()
        if not row:
            raise AppError(code="quiz_not_found", message="Quiz not found", status_code=404)
        
        quiz, owner_name, owner_email, attempts_count = row

        questions_stmt = select(QuizQuestion).where(QuizQuestion.quiz_set_id == quiz_id)
        questions_result = await self._session.execute(questions_stmt)
        questions = questions_result.scalars().all()

        return {
            "id": quiz.id,
            "owner_id": quiz.owner_id,
            "owner_name": owner_name,
            "owner_email": owner_email,
            "document_id": quiz.document_id,
            "document_name": quiz.document_name,
            "title": quiz.title,
            "question_count": quiz.question_count,
            "attempts_count": attempts_count,
            "created_at": quiz.created_at,
            "questions": [
                {
                    "id": q.id,
                    "question": q.question,
                    "options": q.options,
                    "correct_answer": q.correct_answer,
                    "explanation": q.explanation
                } for q in questions
            ]
        }

    async def list_notes(self) -> List[Dict[str, Any]]:
        stmt = select(
            Note,
            User.name.label("owner_name"),
            User.email.label("owner_email")
        ).join(User, Note.user_id == User.id).order_by(desc(Note.created_at))

        result = await self._session.execute(stmt)
        notes = []
        for note, owner_name, owner_email in result:
            notes.append({
                "id": note.id,
                "owner_id": note.user_id,
                "owner_name": owner_name,
                "owner_email": owner_email,
                "workspace_id": note.workspace_id,
                "document_id": note.document_id,
                "title": note.title,
                "content": note.content,
                "is_ai_generated": note.title.startswith("AI Notes:"),
                "created_at": note.created_at
            })
        return notes

    async def get_note(self, note_id: UUID) -> Dict[str, Any]:
        stmt = select(
            Note,
            User.name.label("owner_name"),
            User.email.label("owner_email")
        ).join(User, Note.user_id == User.id).where(Note.id == note_id)

        result = await self._session.execute(stmt)
        row = result.first()
        if not row:
            raise AppError(code="note_not_found", message="Note not found", status_code=404)
        
        note, owner_name, owner_email = row

        return {
            "id": note.id,
            "owner_id": note.user_id,
            "owner_name": owner_name,
            "owner_email": owner_email,
            "workspace_id": note.workspace_id,
            "document_id": note.document_id,
            "title": note.title,
            "content": note.content,
            "is_ai_generated": note.title.startswith("AI Notes:"),
            "created_at": note.created_at
        }

    async def delete_flashcard_deck(self, deck_id: UUID) -> None:
        deck = await self._session.get(FlashcardDeck, deck_id)
        if not deck:
            raise AppError(code="deck_not_found", message="Deck not found", status_code=404)
        await self._session.delete(deck)
        await self._session.commit()

    async def delete_quiz(self, quiz_id: UUID) -> None:
        quiz = await self._session.get(QuizSet, quiz_id)
        if not quiz:
            raise AppError(code="quiz_not_found", message="Quiz not found", status_code=404)
        await self._session.delete(quiz)
        await self._session.commit()

    async def delete_note(self, note_id: UUID) -> None:
        note = await self._session.get(Note, note_id)
        if not note:
            raise AppError(code="note_not_found", message="Note not found", status_code=404)
        await self._session.delete(note)
        await self._session.commit()
