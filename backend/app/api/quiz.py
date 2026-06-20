"""Quiz generation routes — powered by Gemini."""

from __future__ import annotations

import json
import logging
import re
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.session import get_db_session
from sqlalchemy import select
from app.models.user import User
from app.models.quiz import QuizSet, QuizQuestion, QuizAttempt
from app.schemas.quiz import (
    QuizSetResponse, 
    QuizSetDetailResponse, 
    QuizSetUpdateRequest,
    QuizAttemptCreate,
    QuizAttemptResponse,
    AdaptiveQuizRequest
)
from app.repositories.chunk import ChunkRepository
from app.repositories.document import DocumentRepository
from app.services.auth import get_current_user_entity
from app.services.ai.gemini_provider import GeminiGenerationProvider

logger = logging.getLogger("scholarmind.quiz")
router = APIRouter(prefix="/quiz", tags=["quiz"])


class QuizGenerateRequest(BaseModel):
    document_id: str | None = None
    document_ids: list[str] | None = None
    title: str | None = None
    num_questions: int = 10


@router.post("/generate", status_code=status.HTTP_200_OK)
async def generate_quiz(
    body: QuizGenerateRequest,
    user: User = Depends(get_current_user_entity),
    session: AsyncSession = Depends(get_db_session),
) -> dict:
    settings = get_settings()
    doc_ids = body.document_ids or ([body.document_id] if body.document_id else [])

    if not doc_ids:
        raise HTTPException(status_code=400, detail="Document ID(s) required to generate quiz.")

    # 1. Fetch chunks for the document(s)
    chunk_repo = ChunkRepository(session)
    doc_repo = DocumentRepository(session)
    chunks = []
    try:
        for doc_id in doc_ids:
            doc_uuid = uuid.UUID(doc_id)
            doc = await doc_repo.get_by_id_for_owner(doc_uuid, user.id)
            if not doc:
                raise HTTPException(status_code=403, detail="Document not found or unauthorized.")
            doc_chunks = await chunk_repo.get_by_document_id(doc_uuid)
            chunks.extend(doc_chunks)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Document ID format.")

    if not chunks:
        raise HTTPException(status_code=404, detail="No content found for the provided document(s).")

    # 2. Sample chunks evenly (max 15) for broad coverage
    max_chunks = 15
    if len(chunks) > max_chunks:
        step = len(chunks) / max_chunks
        sampled_chunks = [chunks[int(i * step)] for i in range(max_chunks)]
    else:
        sampled_chunks = chunks

    context_text = "\n\n---\n\n".join(
        [f"Excerpt from Page {c.page_number}:\n{c.content}" for c in sampled_chunks]
    )

    # 3. Build prompt with JSON schema enforcement
    prompt = f"""You are an expert educational assessment creator.

Context material from the document:
{context_text}

Task:
Generate exactly {body.num_questions} multiple-choice questions based STRICTLY on the context above.
Focus on: core concepts, terminology, definitions, key theories, and methodologies.
Do NOT generate generic, placeholder, or conversational questions.
Every question must test specific knowledge found in the text.

Return a JSON array. Each item must have:
- "id": unique string (e.g. "q1", "q2")
- "question": the question text (string)
- "options": array of exactly 4 strings (the answer choices)
- "correct": integer 0-3 (index of the correct option)
- "explanation": why the correct answer is correct (string)
- "topic": the concept being tested (string)

Return ONLY the JSON array with no markdown or explanation."""

    # 4. Call AI Provider with JSON mode and retry logic
    from app.services.ai.provider import get_generation_provider
    gen = get_generation_provider()

    max_attempts = 2
    questions = []
    raw_response = ""

    for attempt in range(max_attempts):
        try:
            attempt_prompt = prompt if attempt == 0 else prompt + "\n\nCRITICAL: Return ONLY valid JSON. No markdown. No explanations."
            result = await gen.generate(attempt_prompt, response_json=True)
            raw_response = result.text
            
            # 1. Log the FULL Gemini response before parsing
            logger.warning("RAW QUIZ RESPONSE:\n%s", raw_response)
            
            # 5. Parse output with robust JSON repair
            questions = _clean_and_parse_json(raw_response)
            if questions and len(questions) >= 2:
                logger.info(
                    f"Quiz generation complete on attempt {attempt + 1}",
                    extra={
                        "input_tokens": getattr(result, "input_tokens", 0),
                        "output_tokens": getattr(result, "output_tokens", 0),
                        "doc_ids": doc_ids,
                    },
                )
                break
            else:
                logger.warning(f"Attempt {attempt + 1}: Quiz parse failed. Retrying...")
                
        except Exception as e:
            logger.error(f"Gemini error during quiz generation attempt {attempt + 1}: {e}")

    # Fallback if parsing completely fails after retries
    if not questions or len(questions) < 2:
        logger.error(f"Quiz parse completely failed after {max_attempts} attempts. Using fallback.")
        questions = _generate_fallback_quiz(sampled_chunks)

    if not questions:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to generate quiz: Invalid response from AI provider and fallback failed.",
        )

    # Ensure id field is present for backwards compatibility in frontend optionally
    for i, q in enumerate(questions):
        if "id" not in q:
            q["id"] = f"q{i+1}"

    # Build source references from sampled chunks
    sources = [
        {
            "document_id": str(c.document_id),
            "page_number": c.page_number,
            "snippet": c.content[:200] + "...",
        }
        for c in sampled_chunks[:5]
    ]

    # Save to database
    doc_name = "Global Quiz"
    if len(doc_ids) == 1:
        doc_uuid = uuid.UUID(doc_ids[0])
        doc = await doc_repo.get_by_id_for_owner(doc_uuid, user.id)
        if doc:
            doc_name = doc.title
    elif len(doc_ids) > 1:
        doc_name = f"Multi-Source Quiz ({len(doc_ids)} docs)"

    quiz_title = body.title or doc_name
    
    new_set = QuizSet(
        owner_id=user.id,
        document_id=uuid.UUID(doc_ids[0]) if len(doc_ids) == 1 else None,
        selected_document_ids=doc_ids if doc_ids else None,
        document_name=doc_name,
        title=quiz_title,
        question_count=len(questions),
    )
    session.add(new_set)
    await session.flush()
    
    db_questions = []
    response_questions = []
    for q in questions:
        db_q = QuizQuestion(
            quiz_set_id=new_set.id,
            question=q["question"],
            options=q["options"],
            correct_answer=q["correct"],
            explanation=q.get("explanation", ""),
            topic=q.get("topic", "")
        )
        db_questions.append(db_q)
    
    session.add_all(db_questions)
    await session.commit()
    
    for db_q in db_questions:
        response_questions.append({
            "id": db_q.id,
            "quiz_set_id": new_set.id,
            "question": db_q.question,
            "options": db_q.options,
            "correct_answer": db_q.correct_answer,
            "explanation": db_q.explanation,
            "topic": db_q.topic
        })

    return {"quiz_set_id": str(new_set.id), "questions": response_questions, "sources": sources}


from sqlalchemy.orm import selectinload

@router.get("/sets", response_model=list[QuizSetResponse], status_code=status.HTTP_200_OK)
async def list_quiz_sets(
    user: User = Depends(get_current_user_entity),
    session: AsyncSession = Depends(get_db_session),
) -> list[dict]:
    stmt = (
        select(QuizSet)
        .where(QuizSet.owner_id == user.id)
        .options(selectinload(QuizSet.attempts))
        .order_by(QuizSet.is_favorite.desc(), QuizSet.created_at.desc())
    )
    result = await session.execute(stmt)
    sets = result.scalars().all()
    
    response = []
    for s in sets:
        best_score = max((a.percentage for a in s.attempts), default=None) if s.attempts else None
        attempt_count = len(s.attempts) if s.attempts else 0
        last_score = None
        if attempt_count > 0:
            last_attempt = max(s.attempts, key=lambda a: a.created_at)
            last_score = last_attempt.percentage
            
        response.append({
            "id": s.id,
            "owner_id": s.owner_id,
            "document_id": s.document_id,
            "document_name": s.document_name,
            "selected_document_ids": s.selected_document_ids,
            "title": s.title,
            "question_count": s.question_count,
            "is_favorite": s.is_favorite,
            "created_at": s.created_at,
            "updated_at": s.updated_at,
            "best_score": best_score,
            "last_score": last_score,
            "attempt_count": attempt_count,
        })
    return response


@router.get("/sets/{set_id}", response_model=QuizSetDetailResponse, status_code=status.HTTP_200_OK)
async def get_quiz_set(
    set_id: uuid.UUID,
    user: User = Depends(get_current_user_entity),
    session: AsyncSession = Depends(get_db_session),
) -> dict:
    stmt = (
        select(QuizSet)
        .where(QuizSet.id == set_id, QuizSet.owner_id == user.id)
        .options(selectinload(QuizSet.attempts))
    )
    result = await session.execute(stmt)
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail="Quiz set not found")
        
    best_score = max((a.percentage for a in s.attempts), default=None) if s.attempts else None
    attempt_count = len(s.attempts) if s.attempts else 0
    last_score = None
    if attempt_count > 0:
        last_attempt = max(s.attempts, key=lambda a: a.created_at)
        last_score = last_attempt.percentage
        
    return {
        "id": s.id,
        "owner_id": s.owner_id,
        "document_id": s.document_id,
        "document_name": s.document_name,
        "selected_document_ids": s.selected_document_ids,
        "title": s.title,
        "question_count": s.question_count,
        "is_favorite": s.is_favorite,
        "created_at": s.created_at,
        "updated_at": s.updated_at,
        "best_score": best_score,
        "last_score": last_score,
        "attempt_count": attempt_count,
        "questions": s.questions,
    }


@router.patch("/sets/{set_id}", response_model=QuizSetResponse, status_code=status.HTTP_200_OK)
async def update_quiz_set(
    set_id: uuid.UUID,
    body: QuizSetUpdateRequest,
    user: User = Depends(get_current_user_entity),
    session: AsyncSession = Depends(get_db_session),
) -> QuizSetResponse:
    stmt = select(QuizSet).where(QuizSet.id == set_id, QuizSet.owner_id == user.id)
    result = await session.execute(stmt)
    quiz_set = result.scalar_one_or_none()
    if not quiz_set:
        raise HTTPException(status_code=404, detail="Quiz set not found")
        
    if body.title is not None:
        quiz_set.title = body.title
    if body.is_favorite is not None:
        quiz_set.is_favorite = body.is_favorite
        
    await session.commit()
    await session.refresh(quiz_set)
    return quiz_set


@router.delete("/sets/{set_id}", status_code=status.HTTP_200_OK)
async def delete_quiz_set(
    set_id: uuid.UUID,
    user: User = Depends(get_current_user_entity),
    session: AsyncSession = Depends(get_db_session),
):
    stmt = select(QuizSet).where(QuizSet.id == set_id, QuizSet.owner_id == user.id)
    result = await session.execute(stmt)
    quiz_set = result.scalar_one_or_none()
    if not quiz_set:
        raise HTTPException(status_code=404, detail="Quiz set not found")
        
    await session.delete(quiz_set)
    await session.commit()
    return {"status": "ok"}


@router.post("/sets/{set_id}/attempts", response_model=QuizAttemptResponse, status_code=status.HTTP_200_OK)
async def create_quiz_attempt(
    set_id: uuid.UUID,
    body: QuizAttemptCreate,
    user: User = Depends(get_current_user_entity),
    session: AsyncSession = Depends(get_db_session),
) -> QuizAttemptResponse:
    stmt = select(QuizSet).where(QuizSet.id == set_id, QuizSet.owner_id == user.id)
    result = await session.execute(stmt)
    quiz_set = result.scalar_one_or_none()
    if not quiz_set:
        raise HTTPException(status_code=404, detail="Quiz set not found")
        
    attempt = QuizAttempt(
        quiz_set_id=set_id,
        score=body.score,
        percentage=body.percentage,
    )
    session.add(attempt)
    await session.commit()
    await session.refresh(attempt)
    return attempt


@router.post("/sets/{set_id}/adaptive", response_model=QuizSetDetailResponse, status_code=status.HTTP_200_OK)
async def create_adaptive_quiz(
    set_id: uuid.UUID,
    body: AdaptiveQuizRequest,
    user: User = Depends(get_current_user_entity),
    session: AsyncSession = Depends(get_db_session),
) -> dict:
    stmt = (
        select(QuizSet)
        .where(QuizSet.id == set_id, QuizSet.owner_id == user.id)
        .options(selectinload(QuizSet.questions))
    )
    result = await session.execute(stmt)
    source_set = result.scalar_one_or_none()
    if not source_set:
        raise HTTPException(status_code=404, detail="Source quiz set not found")
        
    target_q_ids = set([str(q_id) for q_id in body.question_ids])
    filtered_questions = [q for q in source_set.questions if str(q.id) in target_q_ids]
    
    if not filtered_questions:
        raise HTTPException(status_code=400, detail="No matching questions found in the source set")

    new_set = QuizSet(
        owner_id=user.id,
        document_id=source_set.document_id,
        selected_document_ids=source_set.selected_document_ids,
        document_name=source_set.document_name,
        title=f"Adaptive Follow-up: {source_set.title or source_set.document_name or 'Quiz'}",
        question_count=len(filtered_questions),
    )
    session.add(new_set)
    await session.flush()
    
    db_questions = []
    response_questions = []
    for q in filtered_questions:
        db_q = QuizQuestion(
            quiz_set_id=new_set.id,
            question=q.question,
            options=q.options,
            correct_answer=q.correct_answer,
            explanation=q.explanation,
            topic=q.topic
        )
        db_questions.append(db_q)
        response_questions.append({
            "id": db_q.id,
            "quiz_set_id": new_set.id,
            "question": q.question,
            "options": q.options,
            "correct_answer": q.correct_answer,
            "explanation": q.explanation,
            "topic": q.topic
        })
    
    session.add_all(db_questions)
    await session.commit()
    
    return {
        "id": new_set.id,
        "owner_id": new_set.owner_id,
        "document_id": new_set.document_id,
        "document_name": new_set.document_name,
        "selected_document_ids": new_set.selected_document_ids,
        "title": new_set.title,
        "question_count": new_set.question_count,
        "is_favorite": False,
        "created_at": new_set.created_at,
        "updated_at": new_set.updated_at,
        "best_score": None,
        "last_score": None,
        "attempt_count": 0,
        "questions": response_questions,
    }


def _clean_and_parse_json(text: str) -> list:
    """Robustly extract and parse a JSON array from LLM output."""
    try:
        # Remove markdown code fences if present
        clean = re.sub(r"```[a-zA-Z]*\n?", "", text)
        clean = re.sub(r"```", "", clean)
        
        # Find the outermost array brackets
        start = clean.find("[")
        end = clean.rfind("]")
        
        if start != -1 and end != -1:
            json_str = clean[start: end + 1]
            
            # Repair: Remove trailing commas before closing brackets/braces
            json_str = re.sub(r",\s*}", "}", json_str)
            json_str = re.sub(r",\s*]", "]", json_str)
            
            parsed = json.loads(json_str)
            if isinstance(parsed, list) and all(isinstance(item, dict) for item in parsed):
                return parsed
    except Exception as e:
        logger.warning(f"Failed to parse JSON list from LLM response: {e}")
    return []

def _generate_fallback_quiz(sampled_chunks: list) -> list:
    """Generate a structured fallback quiz if the LLM completely fails."""
    questions = []
    for i, chunk in enumerate(sampled_chunks[:5]):
        text = chunk.content.strip()
        questions.append({
            "id": f"fallback_q{i+1}",
            "question": f"According to the text from Page {chunk.page_number}, which of the following is true?",
            "options": [
                "The text does not provide enough information.",
                "This concept was detailed in the introductory section.",
                text[:80] + "...",
                "None of the above."
            ],
            "correct": 2,
            "explanation": f"This is an auto-generated fallback question. The correct answer highlights the direct text from Page {chunk.page_number}.",
            "topic": "Reading Comprehension"
        })
    return questions

from app.schemas.quiz import QuizAnalyticsResponse

@router.get("/analytics", response_model=QuizAnalyticsResponse, status_code=status.HTTP_200_OK)
async def get_quiz_analytics(
    user: User = Depends(get_current_user_entity),
    session: AsyncSession = Depends(get_db_session),
) -> QuizAnalyticsResponse:
    stmt = (
        select(QuizSet)
        .where(QuizSet.owner_id == user.id)
        .options(selectinload(QuizSet.attempts))
    )
    result = await session.execute(stmt)
    sets = result.scalars().all()
    
    generated = len(sets)
    attempted = sum(1 for s in sets if s.attempts)
    
    all_attempts = []
    for s in sets:
        all_attempts.extend(s.attempts)
        
    average_score = None
    best_score = None
    if all_attempts:
        average_score = sum(a.percentage for a in all_attempts) / len(all_attempts)
        best_score = max(a.percentage for a in all_attempts)
        
    completion_rate = (attempted / generated * 100) if generated > 0 else 0.0
    
    return QuizAnalyticsResponse(
        generated=generated,
        attempted=attempted,
        average_score=average_score,
        best_score=best_score,
        completion_rate=completion_rate,
    )
