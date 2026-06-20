"""Vector search routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.session import get_db_session
from app.models.user import User
from app.schemas.vector_search import SearchRequest, SearchResponse
from app.services.auth import get_current_user_entity
from app.services.embedding import EmbeddingService
from app.services.vector_search import VectorService


router = APIRouter(prefix="/search", tags=["search"])


@router.post("", response_model=SearchResponse)
async def semantic_search(
    body: SearchRequest,
    user: User = Depends(get_current_user_entity),
    session: AsyncSession = Depends(get_db_session),
) -> SearchResponse:
    settings = get_settings()
    embedding_svc = EmbeddingService(session=session)
    vector_svc = VectorService(session=session)
    query_embedding = await embedding_svc.embed_query(body.query)
    response = await vector_svc.search(
        query_embedding=query_embedding,
        limit=body.limit,
        min_similarity=body.min_similarity,
        owner_id=str(user.id),
    )
    return response
