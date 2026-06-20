"""Admin routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, status, Request, BackgroundTasks
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db_session

from app.models.admin import Admin, AdminRole
from app.schemas.admin import (
    AdminLoginRequest,
    AdminRegisterRequest,
    AdminResponse,
    AdminTokenResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest,
)
from app.services.admin_auth import (
    AdminAuthService,
    get_admin_auth_service,
    get_admin_bearer_token,
    get_current_admin_entity,
    get_current_super_admin,
)
from app.schemas.admin_stats import AdminOverviewResponse
from app.services.admin_stats import AdminStatsService
from app.schemas.admin_users import (
    AdminUserDetailResponse,
    AdminUserListResponse,
)
from app.schemas.admin_documents import (
    AdminDocumentDetailResponse,
    AdminDocumentListResponse,
    AdminDocumentStatsResponse,
)
from app.services.admin_users import AdminUsersService
from app.services.admin_documents import AdminDocumentsService
from app.core.errors import AppError
from uuid import UUID
from sqlalchemy import func, select
from app.services.admin_ai_logs import AdminAILogsService
from app.schemas.admin_ai_logs import (
    AdminAIMetricsResponse,
    AdminAILogsListResponse,
    AdminAIChartsResponse,
)
from app.services.admin_workspaces import AdminWorkspaceService
from app.schemas.admin_workspaces import (
    WorkspaceAdminList,
    WorkspaceAdminDetail,
    WorkspaceAdminStats
)

from app.services.admin_content import AdminContentService
from app.schemas.admin_content import (
    AdminContentStatsResponse,
    AdminFlashcardDeckList,
    AdminFlashcardDeckDetail,
    AdminQuizList,
    AdminQuizDetail,
    AdminNoteList
)

router = APIRouter(prefix="/admin", tags=["admin"])

async def get_optional_super_admin(
    credentials: HTTPAuthorizationCredentials | None = Depends(HTTPBearer(auto_error=False)),
    service: AdminAuthService = Depends(get_admin_auth_service),
) -> Admin | None:
    if not credentials:
        return None
    try:
        admin = await service.get_current_admin_entity(credentials.credentials)
        if admin.role != AdminRole.SUPER_ADMIN:
            return None
        return admin
    except AppError:
        return None


@router.post("/login", response_model=AdminTokenResponse)
async def login(
    payload: AdminLoginRequest,
    service: AdminAuthService = Depends(get_admin_auth_service),
) -> AdminTokenResponse:
    """Login an admin."""
    return await service.login(payload)


@router.post("/register", response_model=AdminTokenResponse)
async def register(
    payload: AdminRegisterRequest,
    request: Request,
    service: AdminAuthService = Depends(get_admin_auth_service),
    session: AsyncSession = Depends(get_db_session)
) -> AdminTokenResponse:
    """Register a new admin.
    
    If no admins exist, anyone can register as SUPER_ADMIN.
    If admins exist, requires a valid SUPER_ADMIN bearer token.
    """
    admin_count = await session.scalar(select(func.count(Admin.id))) or 0
    creator_role = None
    
    if admin_count > 0:
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise AppError("unauthorized", "Admin setup is already complete. A Super Admin token is required to create new admins.", 401)
        token = auth_header.split(" ")[1]
        try:
            creator = await service.get_current_admin_entity(token)
            creator_role = creator.role
        except Exception:
            raise AppError("unauthorized", "Invalid admin token.", 401)

    return await service.register(payload, creator_role)


@router.post("/register-request", status_code=status.HTTP_200_OK)
async def register_request(
    payload: AdminRegisterRequest,
    session: AsyncSession = Depends(get_db_session)
) -> dict[str, str]:
    """Submit an admin access request. Does not immediately create an Admin."""
    import bcrypt
    from app.core.config import get_settings
    from app.models.admin_request import AdminRequest, AdminRequestStatus
    from sqlalchemy import select

    email = payload.email.strip().lower()
    
    # Check if already an admin
    existing_admin = await session.execute(select(Admin).where(Admin.email == email))
    if existing_admin.scalar_one_or_none():
        raise AppError("email_in_use", "Email is already registered as an admin", 409)
        
    # Check if already requested
    existing_request = await session.execute(
        select(AdminRequest).where(AdminRequest.email == email)
    )
    req = existing_request.scalar_one_or_none()
    if req:
        if req.status == AdminRequestStatus.PENDING:
            raise AppError("request_pending", "Your request is already pending approval", 409)
        elif req.status == AdminRequestStatus.REJECTED:
            # Re-apply
            req.status = AdminRequestStatus.PENDING
            req.name = payload.name
            settings = get_settings()
            req.password_hash = bcrypt.hashpw(payload.password.encode("utf-8"), bcrypt.gensalt(settings.password_hash_rounds)).decode("utf-8")
            await session.commit()
            return {"status": "ok", "message": "Request resubmitted successfully"}
        else:
            raise AppError("email_in_use", "Email is already registered", 409)
            
    settings = get_settings()
    password_hash = bcrypt.hashpw(payload.password.encode("utf-8"), bcrypt.gensalt(settings.password_hash_rounds)).decode("utf-8")
    
    new_request = AdminRequest(
        name=payload.name,
        email=email,
        password_hash=password_hash,
        status=AdminRequestStatus.PENDING
    )
    session.add(new_request)
    await session.commit()
    
    return {"status": "ok", "message": "Request submitted successfully"}


@router.post("/auth/refresh", response_model=AdminTokenResponse)
async def refresh(
    refresh_token: str = Depends(get_admin_bearer_token),
    service: AdminAuthService = Depends(get_admin_auth_service),
) -> AdminTokenResponse:
    """Rotate admin refresh token."""
    return await service.refresh(refresh_token)


@router.post("/auth/logout", status_code=status.HTTP_200_OK)
async def logout(
    refresh_token: str = Depends(get_admin_bearer_token),
    service: AdminAuthService = Depends(get_admin_auth_service),
) -> dict[str, str]:
    """Logout the current admin and revoke refresh token."""
    await service.logout(refresh_token)
    return {"status": "ok"}


# Deprecated reset endpoints removed. Use the unified OTP endpoints in auth.py.
@router.get("/me", response_model=AdminResponse)
async def get_me(
    access_token: str = Depends(get_admin_bearer_token),
    service: AdminAuthService = Depends(get_admin_auth_service),
) -> AdminResponse:
    return await service.get_current_admin(access_token)


@router.get("/stats/overview", response_model=AdminOverviewResponse)
async def get_overview_stats(
    admin: Admin = Depends(get_current_admin_entity),
    session: AsyncSession = Depends(get_db_session),
) -> AdminOverviewResponse:
    """Get platform-wide overview statistics for admin dashboard."""
    service = AdminStatsService(session)
    return await service.get_overview_stats()


# --- User Management Routes ---

@router.get("/users", response_model=AdminUserListResponse)
async def get_users(
    page: int = 1,
    size: int = 20,
    search: str | None = None,
    plan: str | None = None,
    status: str | None = None,
    verification: str | None = None,
    signup_date_from: str | None = None,
    signup_date_to: str | None = None,
    admin: Admin = Depends(get_current_admin_entity),
    session: AsyncSession = Depends(get_db_session),
) -> AdminUserListResponse:
    """Get paginated users list."""
    service = AdminUsersService(session)
    return await service.get_users_list(page, size, search, plan, status, verification, signup_date_from, signup_date_to)


@router.get("/users/{user_id}", response_model=AdminUserDetailResponse)
async def get_user_detail(
    user_id: UUID,
    admin: Admin = Depends(get_current_admin_entity),
    session: AsyncSession = Depends(get_db_session),
) -> AdminUserDetailResponse:
    """Get detailed stats and activity for a specific user."""
    service = AdminUsersService(session)
    return await service.get_user_detail(user_id)


@router.post("/users/{user_id}/suspend", status_code=status.HTTP_200_OK)
async def suspend_user(
    user_id: UUID,
    admin: Admin = Depends(get_current_admin_entity),
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, str]:
    """Suspend a user."""
    service = AdminUsersService(session)
    return await service.suspend_user(user_id)


@router.post("/users/{user_id}/activate", status_code=status.HTTP_200_OK)
async def activate_user(
    user_id: UUID,
    admin: Admin = Depends(get_current_admin_entity),
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, str]:
    """Activate a suspended user."""
    service = AdminUsersService(session)
    return await service.activate_user(user_id)


@router.delete("/users/{user_id}", status_code=status.HTTP_200_OK)
async def delete_user(
    user_id: UUID,
    admin: Admin = Depends(get_current_admin_entity),
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, str]:
    """Soft delete a user."""
    service = AdminUsersService(session)
    return await service.delete_user(user_id)


@router.post("/users/{user_id}/reset-stats", status_code=status.HTTP_200_OK)
async def reset_user_stats(
    user_id: UUID,
    admin: Admin = Depends(get_current_admin_entity),
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, str]:
    """Reset a user's numerical statistics."""
    service = AdminUsersService(session)
    return await service.reset_user_stats(user_id)


@router.post("/users/{user_id}/force-logout", status_code=status.HTTP_200_OK)
async def force_logout_user(
    user_id: UUID,
    admin: Admin = Depends(get_current_admin_entity),
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, str]:
    """Force a user to log out."""
    service = AdminUsersService(session)
    return await service.force_logout(user_id)


@router.post("/users/{user_id}/reset-password-email", status_code=status.HTTP_200_OK)
async def reset_password_email(
    user_id: UUID,
    admin: Admin = Depends(get_current_admin_entity),
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, str]:
    """Send a password reset email."""
    service = AdminUsersService(session)
    return await service.reset_password_email(user_id)


@router.post("/users/{user_id}/promote-admin", status_code=status.HTTP_200_OK)
async def promote_user_to_admin(
    user_id: UUID,
    admin: Admin = Depends(get_current_super_admin),
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, str]:
    """Promote user to admin (Super Admin only)."""
    service = AdminUsersService(session)
    return await service.promote_admin(user_id)


# --- DOCUMENTS MODULE ---

@router.get("/documents", response_model=AdminDocumentListResponse)
async def get_admin_documents_list(
    page: int = 1,
    size: int = 20,
    search: str | None = None,
    status: str | None = None,
    admin=Depends(get_current_admin_entity),
    session: AsyncSession = Depends(get_db_session),
) -> AdminDocumentListResponse:
    """Get all documents across the platform."""
    service = AdminDocumentsService(session)
    return await service.get_documents_list(page, size, search, status)


@router.get("/documents/stats", response_model=AdminDocumentStatsResponse)
async def get_admin_document_stats(
    admin=Depends(get_current_admin_entity),
    session: AsyncSession = Depends(get_db_session),
) -> AdminDocumentStatsResponse:
    """Get top-level document statistics."""
    service = AdminDocumentsService(session)
    return await service.get_document_stats()


@router.get("/documents/{document_id}", response_model=AdminDocumentDetailResponse)
async def get_admin_document_detail(
    document_id: UUID,
    admin=Depends(get_current_admin_entity),
    session: AsyncSession = Depends(get_db_session),
) -> AdminDocumentDetailResponse:
    """Get deep metadata for a specific document."""
    service = AdminDocumentsService(session)
    return await service.get_document_detail(document_id)


@router.post("/documents/{document_id}/reprocess")
async def reprocess_admin_document(
    document_id: UUID,
    background_tasks: BackgroundTasks,
    admin=Depends(get_current_admin_entity),
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, str]:
    """Trigger reprocessing for a stuck or failed document."""
    service = AdminDocumentsService(session)
    return await service.reprocess_document(document_id, background_tasks)


@router.delete("/documents/{document_id}")
async def delete_admin_document(
    document_id: UUID,
    admin=Depends(get_current_admin_entity),
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, str]:
    """Hard delete a document from the system."""
    service = AdminDocumentsService(session)
    return await service.delete_document(document_id)

# --- AI MONITORING MODULE ---

@router.get("/ai/metrics", response_model=AdminAIMetricsResponse)
async def get_admin_ai_metrics(
    admin=Depends(get_current_admin_entity),
    session: AsyncSession = Depends(get_db_session),
) -> AdminAIMetricsResponse:
    """Get top-level AI infrastructure statistics."""
    service = AdminAILogsService(session)
    metrics = await service.get_metrics()
    return AdminAIMetricsResponse(**metrics)


@router.get("/ai/charts", response_model=AdminAIChartsResponse)
async def get_admin_ai_charts(
    days: int = 30,
    admin=Depends(get_current_admin_entity),
    session: AsyncSession = Depends(get_db_session),
) -> AdminAIChartsResponse:
    """Get AI usage charting data."""
    service = AdminAILogsService(session)
    charts = await service.get_charts(days=days)
    return AdminAIChartsResponse(**charts)


@router.get("/ai/logs", response_model=AdminAILogsListResponse)
async def get_admin_ai_logs(
    page: int = 1,
    size: int = 50,
    admin=Depends(get_current_admin_entity),
    session: AsyncSession = Depends(get_db_session),
) -> AdminAILogsListResponse:
    """Get recent AI logs for monitoring."""
    service = AdminAILogsService(session)
    offset = (page - 1) * size
    logs = await service.get_logs(limit=size, offset=offset)
    return AdminAILogsListResponse(logs=logs, total=len(logs))

# --- WORKSPACE MANAGEMENT MODULE ---

@router.get("/workspaces/stats", response_model=WorkspaceAdminStats)
async def get_admin_workspace_stats(
    admin=Depends(get_current_admin_entity),
    session: AsyncSession = Depends(get_db_session),
) -> WorkspaceAdminStats:
    """Get system-wide workspace statistics."""
    service = AdminWorkspaceService(session)
    stats = await service.get_workspace_stats()
    return WorkspaceAdminStats(**stats)


@router.get("/workspaces", response_model=list[WorkspaceAdminList])
async def get_admin_workspaces(
    admin=Depends(get_current_admin_entity),
    session: AsyncSession = Depends(get_db_session),
) -> list[WorkspaceAdminList]:
    """Get list of all workspaces with aggregate metrics."""
    service = AdminWorkspaceService(session)
    workspaces = await service.list_workspaces()
    return [WorkspaceAdminList(**ws) for ws in workspaces]


@router.get("/workspaces/{workspace_id}", response_model=WorkspaceAdminDetail)
async def get_admin_workspace_detail(
    workspace_id: UUID,
    admin=Depends(get_current_admin_entity),
    session: AsyncSession = Depends(get_db_session),
) -> WorkspaceAdminDetail:
    """Get detailed information about a single workspace."""
    service = AdminWorkspaceService(session)
    detail = await service.get_workspace_detail(workspace_id)
    return WorkspaceAdminDetail(**detail)


@router.delete("/workspaces/{workspace_id}", status_code=status.HTTP_200_OK)
async def delete_admin_workspace(
    workspace_id: UUID,
    admin=Depends(get_current_admin_entity),
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, str]:
    """Delete a workspace from the system."""
    service = AdminWorkspaceService(session)
    await service.delete_workspace(workspace_id)
    return {"status": "ok", "message": "Workspace deleted successfully"}


# --- CONTENT MONITORING MODULE ---

@router.get("/content/stats", response_model=AdminContentStatsResponse)
async def get_admin_content_stats(
    admin=Depends(get_current_admin_entity),
    session: AsyncSession = Depends(get_db_session),
) -> AdminContentStatsResponse:
    """Get overall content statistics."""
    service = AdminContentService(session)
    stats = await service.get_content_stats()
    return AdminContentStatsResponse(**stats)


@router.get("/content/flashcards", response_model=list[AdminFlashcardDeckList])
async def get_admin_content_flashcards(
    admin=Depends(get_current_admin_entity),
    session: AsyncSession = Depends(get_db_session),
) -> list[AdminFlashcardDeckList]:
    """Get list of flashcard decks."""
    service = AdminContentService(session)
    decks = await service.list_flashcard_decks()
    return [AdminFlashcardDeckList(**d) for d in decks]


@router.get("/content/flashcards/{deck_id}", response_model=AdminFlashcardDeckDetail)
async def get_admin_content_flashcard_detail(
    deck_id: UUID,
    admin=Depends(get_current_admin_entity),
    session: AsyncSession = Depends(get_db_session),
) -> AdminFlashcardDeckDetail:
    """Get flashcard deck details."""
    service = AdminContentService(session)
    detail = await service.get_flashcard_deck(deck_id)
    return AdminFlashcardDeckDetail(**detail)


@router.delete("/content/flashcards/{deck_id}", status_code=status.HTTP_200_OK)
async def delete_admin_content_flashcard(
    deck_id: UUID,
    admin=Depends(get_current_admin_entity),
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, str]:
    """Delete a corrupted flashcard deck."""
    service = AdminContentService(session)
    await service.delete_flashcard_deck(deck_id)
    return {"status": "ok", "message": "Flashcard deck deleted successfully"}


@router.get("/content/quizzes", response_model=list[AdminQuizList])
async def get_admin_content_quizzes(
    admin=Depends(get_current_admin_entity),
    session: AsyncSession = Depends(get_db_session),
) -> list[AdminQuizList]:
    """Get list of quizzes."""
    service = AdminContentService(session)
    quizzes = await service.list_quizzes()
    return [AdminQuizList(**q) for q in quizzes]


@router.get("/content/quizzes/{quiz_id}", response_model=AdminQuizDetail)
async def get_admin_content_quiz_detail(
    quiz_id: UUID,
    admin=Depends(get_current_admin_entity),
    session: AsyncSession = Depends(get_db_session),
) -> AdminQuizDetail:
    """Get quiz details."""
    service = AdminContentService(session)
    detail = await service.get_quiz(quiz_id)
    return AdminQuizDetail(**detail)


@router.delete("/content/quizzes/{quiz_id}", status_code=status.HTTP_200_OK)
async def delete_admin_content_quiz(
    quiz_id: UUID,
    admin=Depends(get_current_admin_entity),
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, str]:
    """Delete a corrupted quiz."""
    service = AdminContentService(session)
    await service.delete_quiz(quiz_id)
    return {"status": "ok", "message": "Quiz deleted successfully"}


@router.get("/content/notes", response_model=list[AdminNoteList])
async def get_admin_content_notes(
    admin=Depends(get_current_admin_entity),
    session: AsyncSession = Depends(get_db_session),
) -> list[AdminNoteList]:
    """Get list of notes."""
    service = AdminContentService(session)
    notes = await service.list_notes()
    return [AdminNoteList(**n) for n in notes]


@router.delete("/content/notes/{note_id}", status_code=status.HTTP_200_OK)
async def delete_admin_content_note(
    note_id: UUID,
    admin=Depends(get_current_admin_entity),
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, str]:
    """Delete a corrupted note."""
    service = AdminContentService(session)
    await service.delete_note(note_id)
    return {"status": "ok", "message": "Note deleted successfully"}

