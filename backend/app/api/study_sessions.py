"""Study session routes."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel

from app.core.config import get_settings
from app.db.session import get_db_session
from app.models.user import User
from app.schemas.study import StudySessionCreate, StudySessionResponse, StudyStatsResponse
from app.services.auth import get_current_user_entity
from app.services.study_sessions import StudySessionService


router = APIRouter(prefix="/study", tags=["study"])


class StartSessionResponse(BaseModel):
    """Response for starting a session."""

    session_id: UUID
    feature_used: str
    started_at: datetime


class EndSessionRequest(BaseModel):
    """Request to end a session."""

    duration_seconds: int


class EndSessionResponse(BaseModel):
    """Response for ending a session."""

    session_id: UUID
    duration_seconds: int
    ended_at: datetime


@router.post("/sessions/start", response_model=StartSessionResponse, status_code=status.HTTP_201_CREATED)
async def start_session(
    payload: StudySessionCreate,
    user: User = Depends(get_current_user_entity),
    session = Depends(get_db_session),
) -> StartSessionResponse:
    """Start a new study session."""
    log_msg = f"[WATCH] Request reached endpoint: POST /study/sessions/start | User: {user.id} | Body: {payload.model_dump()}"
    print(log_msg)
    with open("endpoint_hits.log", "a") as f:
        f.write(log_msg + "\n")
        
    print(f"\n[DEBUG /sessions/start] Authenticated User ID: {user.id}")
    print(f"[DEBUG /sessions/start] Feature: {payload.feature_used}")
    
    service = StudySessionService(session=session, settings=get_settings())
    result = await service.start_session(user.id, payload.feature_used)
    
    print(f"[DEBUG /sessions/start] Created Session ID: {result.id}\n")
    return StartSessionResponse(
        session_id=result.id,
        feature_used=result.feature_used,
        started_at=result.started_at,
    )


@router.post("/sessions/{session_id}/end", response_model=EndSessionResponse)
async def end_session(
    session_id: UUID,
    payload: EndSessionRequest,
    user: User = Depends(get_current_user_entity),
    session = Depends(get_db_session),
) -> EndSessionResponse:
    """End an active study session."""
    log_msg = f"[WATCH] Request reached endpoint: POST /study/sessions/{session_id}/end | User: {user.id} | Session ID: {session_id}"
    print(log_msg)
    with open("endpoint_hits.log", "a") as f:
        f.write(log_msg + "\n")
        
    print(f"\n[DEBUG /sessions/end] Authenticated User ID: {user.id}")
    print(f"[DEBUG /sessions/end] Target Session ID: {session_id}")
    print(f"[DEBUG /sessions/end] Duration Seconds: {payload.duration_seconds}")
    
    service = StudySessionService(session=session, settings=get_settings())
    result = await service.end_session(session_id, payload.duration_seconds)
    if not result:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Session not found or already ended")
    return EndSessionResponse(
        session_id=result.id,
        duration_seconds=result.duration_seconds,
        ended_at=result.ended_at,
    )


@router.get("/stats", response_model=StudyStatsResponse)
async def get_study_stats(
    user: User = Depends(get_current_user_entity),
    session = Depends(get_db_session),
) -> StudyStatsResponse:
    """Get study statistics for the current user."""
    service = StudySessionService(session=session, settings=get_settings())
    stats = await service.get_stats(user.id)
    return StudyStatsResponse(**stats)


@router.get("/sessions/recent", response_model=list[StudySessionResponse])
async def get_recent_sessions(
    limit: int = 20,
    user: User = Depends(get_current_user_entity),
    session = Depends(get_db_session),
) -> list[StudySessionResponse]:
    """Get recent study sessions."""
    service = StudySessionService(session=session, settings=get_settings())
    results = await service.get_recent_sessions(user.id, limit)
    return [
        StudySessionResponse(
            id=r.id,
            user_id=r.user_id,
            feature_used=r.feature_used,
            started_at=r.started_at,
            ended_at=r.ended_at,
            duration_seconds=r.duration_seconds,
            created_at=r.created_at,
            updated_at=r.updated_at,
        )
        for r in results
    ]
