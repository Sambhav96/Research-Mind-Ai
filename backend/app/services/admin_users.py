"""Admin User Management Service."""

from __future__ import annotations

import asyncio
from uuid import UUID

from sqlalchemy import func, select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.models.chat_session import ChatSession
from app.models.document import Document
from app.models.flashcard import FlashcardDeck
from app.models.note import Note
from app.models.quiz import QuizSet
from app.models.user import User
from app.models.user_metadata import UserMetadata
from app.models.workspace import Workspace
from app.schemas.admin_users import (
    AdminUserDetailResponse,
    AdminUserListItem,
    AdminUserListResponse,
    UserActivityHistoryItem,
    UserActivityStats,
)


class AdminUsersService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_users_list(
        self, page: int = 1, size: int = 20, search: str | None = None, plan: str | None = None,
        status: str | None = None, verification: str | None = None,
        signup_date_from: str | None = None, signup_date_to: str | None = None
    ) -> AdminUserListResponse:
        """Get a paginated list of users with filtering and search."""
        from datetime import datetime
        
        # Base query for users
        stmt = select(User, UserMetadata).outerjoin(UserMetadata, User.id == UserMetadata.user_id).where(User.deleted_at.is_(None))
        
        if search:
            search_term = f"%{search}%"
            stmt = stmt.where(or_(User.email.ilike(search_term), User.name.ilike(search_term)))
            
        if plan and plan.lower() != "all":
            stmt = stmt.where(UserMetadata.plan == plan.lower())
            
        if status and status.lower() != "all":
            if status.lower() == "active":
                stmt = stmt.where(User.is_active == True)
            elif status.lower() == "suspended":
                stmt = stmt.where(User.is_active == False)
                
        if verification and verification.lower() != "all":
            if verification.lower() == "verified":
                stmt = stmt.where(User.is_verified == True)
            elif verification.lower() == "unverified":
                stmt = stmt.where(User.is_verified == False)
                
        if signup_date_from:
            try:
                date_from = datetime.fromisoformat(signup_date_from)
                stmt = stmt.where(User.created_at >= date_from)
            except ValueError:
                pass
                
        if signup_date_to:
            try:
                date_to = datetime.fromisoformat(signup_date_to)
                stmt = stmt.where(User.created_at <= date_to)
            except ValueError:
                pass
            
        # Total count
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = await self._session.scalar(count_stmt) or 0
        
        # Pagination
        stmt = stmt.order_by(User.created_at.desc()).offset((page - 1) * size).limit(size)
        result = await self._session.execute(stmt)
        users_with_meta = result.all()
        
        # For document counts, we fetch it per user. For a list of 20, we can do it efficiently.
        user_ids = [row[0].id for row in users_with_meta]
        doc_counts_stmt = select(Document.owner_id, func.count(Document.id)).where(Document.owner_id.in_(user_ids)).group_by(Document.owner_id)
        doc_counts_res = await self._session.execute(doc_counts_stmt)
        doc_counts = {row[0]: row[1] for row in doc_counts_res.all()}
        
        items = []
        for u, m in users_with_meta:
            items.append(AdminUserListItem(
                id=u.id,
                email=u.email,
                name=u.name,
                plan=m.plan if m else "free",
                is_active=u.is_active,
                is_verified=u.is_verified,
                created_at=u.created_at,
                last_login_at=u.last_login_at,
                document_count=doc_counts.get(u.id, 0),
                research_score=m.research_score if m else 0,
            ))
            
        return AdminUserListResponse(
            users=items,
            total=total,
            page=page,
            size=size
        )

    async def _get_user_or_404(self, user_id: UUID) -> User:
        user = await self._session.get(User, user_id)
        if not user or user.deleted_at is not None:
            raise AppError("user_not_found", "User not found", 404)
        return user

    async def get_user_detail(self, user_id: UUID) -> AdminUserDetailResponse:
        """Get deep details and stats for a specific user."""
        user = await self._get_user_or_404(user_id)
        m = await self._session.scalar(select(UserMetadata).where(UserMetadata.user_id == user_id))
        
        # Fetch stats sequentially to avoid SQLAlchemy concurrent session issues
        w_count = await self._session.scalar(select(func.count(Workspace.id)).where(Workspace.owner_id == user_id)) or 0
        d_count = await self._session.scalar(select(func.count(Document.id)).where(Document.owner_id == user_id)) or 0
        f_count = await self._session.scalar(select(func.count(FlashcardDeck.id)).where(FlashcardDeck.owner_id == user_id)) or 0
        q_count = await self._session.scalar(select(func.count(QuizSet.id)).where(QuizSet.owner_id == user_id)) or 0
        n_count = await self._session.scalar(select(func.count(Note.id)).where(Note.user_id == user_id)) or 0
        c_count = await self._session.scalar(select(func.count(ChatSession.id)).where(ChatSession.owner_id == user_id)) or 0

        # Recent Activity (Combined)
        docs = await self._session.execute(select(Document.id, Document.title, Document.created_at).where(Document.owner_id == user_id).order_by(Document.created_at.desc()).limit(5))
        quizzes = await self._session.execute(select(QuizSet.id, QuizSet.title, QuizSet.created_at).where(QuizSet.owner_id == user_id).order_by(QuizSet.created_at.desc()).limit(5))
        workspaces = await self._session.execute(select(Workspace.id, Workspace.name, Workspace.created_at).where(Workspace.owner_id == user_id).order_by(Workspace.created_at.desc()).limit(5))
        
        activities = []
        for d in docs.all():
            activities.append(UserActivityHistoryItem(id=str(d[0]), type="document", title=f"Uploaded document: {d[1]}", created_at=d[2]))
        for q in quizzes.all():
            activities.append(UserActivityHistoryItem(id=str(q[0]), type="quiz", title=f"Generated quiz: {q[1]}", created_at=q[2]))
        for w in workspaces.all():
            activities.append(UserActivityHistoryItem(id=str(w[0]), type="workspace", title=f"Created workspace: {w[1]}", created_at=w[2]))
            
        activities.sort(key=lambda x: x.created_at, reverse=True)
        
        return AdminUserDetailResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            plan=m.plan if m else "free",
            is_active=user.is_active,
            is_verified=user.is_verified,
            created_at=user.created_at,
            last_login_at=user.last_login_at,
            research_score=m.research_score if m else 0,
            stats=UserActivityStats(
                workspaces_count=w_count,
                documents_count=d_count,
                flashcards_count=f_count,
                quizzes_count=q_count,
                notes_count=n_count,
                chats_count=c_count,
            ),
            recent_activity=activities[:10]
        )

    async def suspend_user(self, user_id: UUID) -> dict[str, str]:
        user = await self._get_user_or_404(user_id)
        user.is_active = False
        await self._session.commit()
        return {"status": "ok", "message": "User suspended"}

    async def activate_user(self, user_id: UUID) -> dict[str, str]:
        user = await self._get_user_or_404(user_id)
        user.is_active = True
        await self._session.commit()
        return {"status": "ok", "message": "User activated"}

    async def delete_user(self, user_id: UUID) -> dict[str, str]:
        user = await self._get_user_or_404(user_id)
        await self._session.delete(user) # Note: Soft delete mixin handles this
        await self._session.commit()
        return {"status": "ok", "message": "User deleted"}

    async def reset_user_stats(self, user_id: UUID) -> dict[str, str]:
        """Resets the user's numeric research score but keeps their data."""
        user = await self._get_user_or_404(user_id)
        m = await self._session.scalar(select(UserMetadata).where(UserMetadata.user_id == user_id))
        if m:
            m.research_score = 0
        else:
            m = UserMetadata(user_id=user_id, plan="free", research_score=0)
            self._session.add(m)
        await self._session.commit()
        return {"status": "ok", "message": "User stats reset"}

    async def force_logout(self, user_id: UUID) -> dict[str, str]:
        """Forces the user to log out by clearing their refresh token."""
        user = await self._get_user_or_404(user_id)
        user.refresh_token_hash = None
        user.refresh_token_expires_at = None
        await self._session.commit()
        return {"status": "ok", "message": "User forced logout successfully"}

    async def reset_password_email(self, user_id: UUID) -> dict[str, str]:
        """Sends a password reset email to the user (mocked)."""
        user = await self._get_user_or_404(user_id)
        # Mocking sending email
        return {"status": "ok", "message": f"Password reset email sent to {user.email}"}

    async def promote_admin(self, user_id: UUID) -> dict[str, str]:
        """Promote a user to Admin role."""
        user = await self._get_user_or_404(user_id)
        from app.models.admin import Admin, AdminRole
        import bcrypt
        from app.core.config import get_settings
        settings = get_settings()
        
        existing = await self._session.scalar(select(Admin).where(Admin.email == user.email))
        if existing:
            raise AppError("already_admin", "User is already an admin", 400)
            
        admin = Admin(
            email=user.email,
            name=user.name,
            password_hash=bcrypt.hashpw("TemporaryPass123!".encode("utf-8"), bcrypt.gensalt(settings.password_hash_rounds)).decode("utf-8"),
            role=AdminRole.ADMIN
        )
        self._session.add(admin)
        await self._session.commit()
        return {"status": "ok", "message": f"User {user.email} promoted to Admin. Temporary password: TemporaryPass123!"}
