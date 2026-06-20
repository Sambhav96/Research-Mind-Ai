"""Flashcard generation routes — powered by Gemini."""

from __future__ import annotations

import json
import logging
import re
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import get_settings
from app.db.session import get_db_session
from app.models.user import User
from app.models.flashcard import FlashcardDeck, Flashcard
from app.schemas.flashcards import FlashcardDeckResponse, FlashcardDeckDetailResponse

class FlashcardDeckUpdateRequest(BaseModel):
    title: str
from app.repositories.chunk import ChunkRepository
from app.repositories.document import DocumentRepository
from app.services.auth import get_current_user_entity
from app.services.ai.gemini_provider import GeminiGenerationProvider

logger = logging.getLogger("scholarmind.flashcards")
router = APIRouter(prefix="/flashcards", tags=["flashcards"])


class FlashcardGenerateRequest(BaseModel):
    document_id: str | None = None
    document_ids: list[str] | None = None
    title: str | None = None
    num_cards: int = 10

@router.post("/generate", status_code=status.HTTP_200_OK)
async def generate_flashcards(
    body: FlashcardGenerateRequest,
    user: User = Depends(get_current_user_entity),
    session: AsyncSession = Depends(get_db_session),
) -> dict:
    settings = get_settings()
    doc_ids = body.document_ids or ([body.document_id] if body.document_id else None)
    # Gemini free tier becomes unstable with very large JSON outputs
    if body.num_cards > 10:
        body.num_cards = 10

    if not doc_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one document must be selected.",
        )

    # 1. Fetch all chunks for the selected documents
    chunk_repo = ChunkRepository(session)
    doc_repo = DocumentRepository(session)
    all_chunks = []
    doc_titles: dict[str, str] = {}

    for doc_id_str in doc_ids:
        try:
            doc_uuid = UUID(doc_id_str)
        except ValueError:
            continue
            
        doc = await doc_repo.get_by_id_for_owner(doc_uuid, user.id)
        if not doc:
            continue

        chunks = await chunk_repo.get_by_document_id(doc_uuid)
        if chunks:
            all_chunks.extend(chunks)
            # Capture document title from first chunk that has it
            if doc_id_str not in doc_titles and chunks:
                doc_titles[doc_id_str] = getattr(chunks[0], "document_title", doc.title or doc_id_str)

    if not all_chunks:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No content found for the provided document(s).",
        )

    # 2. Sample chunks for broad coverage (max 15)
    max_chunks = 8
    if len(all_chunks) > max_chunks:
        step = len(all_chunks) / max_chunks
        sampled_chunks = [all_chunks[int(i * step)] for i in range(max_chunks)]
    else:
        sampled_chunks = all_chunks

    # 3. Build context with page and document references
    context_parts = []
    for i, c in enumerate(sampled_chunks):
        doc_id_str = str(c.document_id)
        title = doc_titles.get(doc_id_str, doc_id_str)
        context_parts.append(
            f"Excerpt {i+1} [Document: {title}, Page {c.page_number}]:\n{c.content}"
        )
    context_text = "\n\n".join(context_parts)

    # 4. Build prompt with JSON schema enforcement
    prompt = f"""You are an expert educational content creator specializing in research summaries.

Below are excerpts from the user's document(s):
{context_text}

Task:
Generate exactly {body.num_cards} flashcards that cover the most important concepts, terminology, theories, and methodologies from the text above.
Every flashcard must be grounded in the provided excerpts. Do NOT create generic or placeholder cards.

Return a JSON array. Each item must have:
- "id": unique string (e.g. "f1", "f2")
- "front": the concept, term, or question (string — concise, 1-2 sentences)
- "back": the explanation or answer (string — accurate, 2-4 sentences)
- "topic": the subject area being covered (string)
- "source_document": the document title this came from (string)
- "page_reference": the page number reference (string, e.g. "p.3" or "pp.3-5")

Return ONLY the JSON array with no markdown or explanation."""

    # 5. Call AI Provider with JSON mode
    from app.services.ai.provider import get_generation_provider
    gen = get_generation_provider()

    try:
        logger.info(
    f"FLASHCARD REQUEST => "
    f"chunks={len(sampled_chunks)}, "
    f"cards={body.num_cards}, "
    f"context_chars={len(context_text)}"
)
        result = await gen.generate(prompt, response_json=True, temperature=0.3)
        answer = result.text
        logger.info(
            "Flashcard generation complete",
            extra={
                "input_tokens": result.input_tokens,
                "output_tokens": result.output_tokens,
                "doc_ids": doc_ids,
            },
        )
    except Exception as e:
        logger.exception(
            f"FLASHCARD FAILURE: AI PROVIDER FAILED: {e}"
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to generate flashcards: Error from AI provider.",
        )

    # --- FORENSIC TRACE START ---
    logger.info("=== FLASHCARD GENERATION TRACE ===")
    char_count = len(answer)
    token_est = char_count // 4
    first_500 = answer[:500]
    last_500 = answer[-500:] if char_count > 500 else ""
    
    logger.info(f"Raw response length: {char_count} chars (~{token_est} tokens)")
    logger.info(f"First 500 chars:\n{first_500}")
    logger.info(f"Last 500 chars:\n{last_500}")
    
    import os
    os.makedirs("logs", exist_ok=True)
    with open("logs/flashcard_raw_response.txt", "w", encoding="utf-8") as f:
        f.write(answer)
    logger.info("Saved raw response to logs/flashcard_raw_response.txt")
    
    # Analyze structure
    struct_type = "Unknown"
    if answer.strip().startswith("[") and answer.strip().endswith("]"):
        struct_type = "A. Complete JSON Array"
    elif answer.strip().startswith("[") and not answer.strip().endswith("]"):
        struct_type = "B. Truncated JSON Array"
    elif answer.strip().startswith("```"):
        struct_type = "C. Markdown wrapped JSON"
    elif answer.strip().startswith("{") and '"flashcards"' in answer:
        struct_type = "D. JSON object containing flashcards key"
    else:
        struct_type = "E. Mixed text + JSON"
        
    logger.info(f"Detected Structure: {struct_type}")
    
    # 6. Parse output
    logger.info("-> Passing to parser...")
    flashcards, diagnostics = _parse_json_list(answer)
    logger.info(f"-> Parser output: {len(flashcards)} flashcards extracted")
    
    if not flashcards:
        logger.error(
            f"FLASHCARD FAILURE: PARSER RETURNED EMPTY\n"
            f"response_length: {diagnostics.get('raw_length')}\n"
            f"truncation_status: {diagnostics.get('is_truncated')}\n"
            f"First 1000 chars:\n{answer[:1000]}"
        )
        
        # 7. Auto-fallback for truncation
        is_truncated = (
            "Truncated" in struct_type or 
            diagnostics.get("is_truncated") is True
        )
        
        if is_truncated and body.num_cards > 5:
            logger.warning("Response was truncated! Reducing to 5 cards and retrying...")
            body.num_cards = 5
            return await generate_flashcards(body, user, session)
            
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to generate flashcards: Invalid response from AI provider.",
        )

    # Ensure id field is present
    for i, card in enumerate(flashcards):
        if "id" not in card:
            card["id"] = f"f{i+1}"

    # Build source references from sampled chunks
    sources = [
        {
            "document_id": str(c.document_id),
            "page_number": c.page_number,
            "snippet": c.content[:200] + "...",
        }
        for c in sampled_chunks[:5]
    ]

    logger.info(f"-> Returning frontend payload: {len(flashcards)} flashcards, {len(sources)} sources")

    # Save to database
    doc_uuid = None
    if doc_ids and len(doc_ids) == 1:
        try:
            doc_uuid = UUID(doc_ids[0])
        except ValueError:
            pass

    deck_name = body.title
    if not deck_name:
        if doc_uuid and doc_ids[0] in doc_titles:
            deck_name = doc_titles[doc_ids[0]]
        else:
            deck_name = "Global Deck" if not doc_ids or len(doc_ids) > 1 else "Document Deck"

    new_deck = FlashcardDeck(
        owner_id=user.id,
        document_id=doc_uuid,
        document_name=deck_name,
        card_count=len(flashcards),
    )
    session.add(new_deck)
    await session.commit()
    await session.refresh(new_deck)

    db_cards = []
    for i, card in enumerate(flashcards):
        db_card = Flashcard(
            deck_id=new_deck.id,
            question=card.get("front", ""),
            answer=card.get("back", ""),
            topic=card.get("topic", ""),
            page_reference=card.get("page_reference", ""),
            order_index=i,
        )
        db_cards.append(db_card)
        
    session.add_all(db_cards)
    await session.commit()

    return {"deck_id": str(new_deck.id), "flashcards": flashcards, "sources": sources}


@router.get("/decks", response_model=list[FlashcardDeckResponse], status_code=status.HTTP_200_OK)
async def list_flashcard_decks(
    user: User = Depends(get_current_user_entity),
    session: AsyncSession = Depends(get_db_session),
) -> list[FlashcardDeckResponse]:
    stmt = select(FlashcardDeck).where(FlashcardDeck.owner_id == user.id).order_by(FlashcardDeck.created_at.desc())
    result = await session.execute(stmt)
    decks = result.scalars().all()
    return decks


@router.get("/decks/{deck_id}", response_model=FlashcardDeckDetailResponse, status_code=status.HTTP_200_OK)
async def get_flashcard_deck(
    deck_id: UUID,
    user: User = Depends(get_current_user_entity),
    session: AsyncSession = Depends(get_db_session),
) -> FlashcardDeckDetailResponse:
    stmt = select(FlashcardDeck).where(FlashcardDeck.id == deck_id, FlashcardDeck.owner_id == user.id)
    result = await session.execute(stmt)
    deck = result.scalar_one_or_none()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
        
    cards_stmt = select(Flashcard).where(Flashcard.deck_id == deck_id).order_by(Flashcard.order_index)
    cards_result = await session.execute(cards_stmt)
    cards = cards_result.scalars().all()
    
    return FlashcardDeckDetailResponse(
        id=deck.id,
        owner_id=deck.owner_id,
        document_id=deck.document_id,
        document_name=deck.document_name,
        card_count=deck.card_count,
        created_at=deck.created_at,
        updated_at=deck.updated_at,
        cards=cards,
    )


@router.get("/document/{document_id}", response_model=FlashcardDeckResponse, status_code=status.HTTP_200_OK)
async def get_deck_by_document(
    document_id: UUID,
    user: User = Depends(get_current_user_entity),
    session: AsyncSession = Depends(get_db_session),
) -> FlashcardDeckResponse:
    stmt = select(FlashcardDeck).where(FlashcardDeck.document_id == document_id, FlashcardDeck.owner_id == user.id).order_by(FlashcardDeck.created_at.desc())
    result = await session.execute(stmt)
    deck = result.scalar_one_or_none() # get the most recent one if there are multiple
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found for document")
    return deck


@router.patch("/decks/{deck_id}", response_model=FlashcardDeckResponse, status_code=status.HTTP_200_OK)
async def update_flashcard_deck(
    deck_id: UUID,
    body: FlashcardDeckUpdateRequest,
    user: User = Depends(get_current_user_entity),
    session: AsyncSession = Depends(get_db_session),
) -> FlashcardDeckResponse:
    stmt = select(FlashcardDeck).where(FlashcardDeck.id == deck_id, FlashcardDeck.owner_id == user.id)
    result = await session.execute(stmt)
    deck = result.scalar_one_or_none()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
        
    deck.document_name = body.title
    await session.commit()
    await session.refresh(deck)
    return deck


@router.delete("/decks/{deck_id}", status_code=status.HTTP_200_OK)
async def delete_flashcard_deck(
    deck_id: UUID,
    user: User = Depends(get_current_user_entity),
    session: AsyncSession = Depends(get_db_session),
):
    stmt = select(FlashcardDeck).where(FlashcardDeck.id == deck_id, FlashcardDeck.owner_id == user.id)
    result = await session.execute(stmt)
    deck = result.scalar_one_or_none()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
        
    await session.delete(deck)
    await session.commit()
    return {"status": "success"}


def _parse_json_list(text: str) -> tuple[list, dict]:
    """Extract a JSON array from LLM output (handles any residual markdown fences)."""
    import traceback
    
    logger.debug(f"FULL GEMINI RESPONSE:\n{text}")
    
    diagnostics = {
        "raw_length": len(text),
        "parse_method": "none",
        "failure_reason": None,
        "is_truncated": False,
    }
    
    # Advanced truncation detection
    text_stripped = text.strip()
    has_unmatched_brackets = text.count('[') > text.count(']')
    has_unmatched_braces = text.count('{') > text.count('}')
    is_long = len(text) > 4500
    ends_mid_object = len(text_stripped) > 0 and text_stripped[-1] not in (']', '}')
    
    if has_unmatched_brackets or has_unmatched_braces or ends_mid_object or is_long:
        diagnostics["is_truncated"] = True

    try:
        clean_text = re.sub(r"```(?:json)?\n?", "", text).replace("```", "").strip()
        try:
            parsed = json.loads(clean_text)
            if isinstance(parsed, list):
                diagnostics["parse_method"] = "direct_list"
                logger.info(f"Flashcard parsing succeeded: {diagnostics}")
                return [item for item in parsed if isinstance(item, dict)], diagnostics
            elif isinstance(parsed, dict):
                for key, val in parsed.items():
                    if isinstance(val, list) and len(val) > 0 and isinstance(val[0], dict):
                        diagnostics["parse_method"] = "dict_key_extraction"
                        logger.info(f"Flashcard parsing succeeded: {diagnostics}")
                        return [item for item in val if isinstance(item, dict)], diagnostics
        except json.JSONDecodeError:
            pass
        
        start = clean_text.find("[")
        end = clean_text.rfind("]")
        
        if start != -1 and end != -1 and start < end:
            substring = clean_text[start: end + 1]
            try:
                parsed = json.loads(substring)
                if isinstance(parsed, list):
                    diagnostics["parse_method"] = "substring_bracket_extraction"
                    logger.info(f"Flashcard parsing succeeded: {diagnostics}")
                    return [item for item in parsed if isinstance(item, dict)], diagnostics
            except json.JSONDecodeError as e:
                try:
                    fixed_substring = re.sub(r",\s*]", "]", substring)
                    parsed = json.loads(fixed_substring)
                    if isinstance(parsed, list):
                        diagnostics["parse_method"] = "substring_trailing_comma_fix"
                        logger.info(f"Flashcard parsing succeeded: {diagnostics}")
                        return [item for item in parsed if isinstance(item, dict)], diagnostics
                except json.JSONDecodeError:
                    pass
                    
                diagnostics["failure_reason"] = f"JSONDecodeError: {str(e)}"
                logger.error(f"Flashcard parse failed. Traceback:\n{traceback.format_exc()}")
        else:
            diagnostics["failure_reason"] = "No valid JSON array brackets found"

    except Exception as e:
        diagnostics["failure_reason"] = f"Unexpected exception: {str(e)}"
        logger.error(f"Unexpected error during flashcard parsing:\n{traceback.format_exc()}")
        
    logger.error(f"Flashcard parsing failed. Diagnostics: {diagnostics}")
    return [], diagnostics


from datetime import datetime, timedelta
from app.schemas.flashcards import FlashcardAnalyticsResponse

@router.get("/analytics", response_model=FlashcardAnalyticsResponse, status_code=status.HTTP_200_OK)
async def get_flashcard_analytics(
    user: User = Depends(get_current_user_entity),
    session: AsyncSession = Depends(get_db_session),
) -> FlashcardAnalyticsResponse:
    stmt = select(FlashcardDeck).where(FlashcardDeck.owner_id == user.id)
    result = await session.execute(stmt)
    decks = result.scalars().all()
    
    total_decks = len(decks)
    total_cards = sum(d.card_count for d in decks)
    
    now = datetime.now()
    week_start = now - timedelta(days=7)
    month_start = now - timedelta(days=30)
    
    week_cards = sum(d.card_count for d in decks if d.created_at.replace(tzinfo=None) >= week_start)
    month_cards = sum(d.card_count for d in decks if d.created_at.replace(tzinfo=None) >= month_start)
    
    return FlashcardAnalyticsResponse(
        total_decks=total_decks,
        total_cards=total_cards,
        generated_this_week=week_cards,
        generated_this_month=month_cards,
    )
