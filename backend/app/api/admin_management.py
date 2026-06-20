"""Admin Management routes (Module 10)."""

from __future__ import annotations

import secrets
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, EmailStr
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
import bcrypt

from app.core.config import get_settings
from app.core.errors import AppError
from app.db.session import get_db_session
from app.models.admin import Admin, AdminRole
from app.models.admin_action_log import AdminActionLog
from app.services.admin_auth import get_current_super_admin

router = APIRouter(prefix="/admin/management", tags=["admin_management"])

# --- Schemas ---

class AdminRequestResponse(BaseModel):
    id: str
    name: str
    email: str
    status: str
    created_at: str

class AdminManagementResponse(BaseModel):
    id: str
    name: Optional[str]
    email: str
    role: str
    is_active: bool
    created_at: str
    last_login: Optional[str]

class AdminCreateRequest(BaseModel):
    name: str
    email: EmailStr
    role: AdminRole

class AdminCreateResponse(BaseModel):
    admin: AdminManagementResponse
    temporary_password: str

class AdminRoleUpdateRequest(BaseModel):
    role: AdminRole

class AdminActionLogResponse(BaseModel):
    id: str
    admin_email: str  # We will join to get this
    action: str
    target: str
    reason: Optional[str]
    created_at: str

# --- Endpoints ---

async def _log_action(session: AsyncSession, admin_id: UUID, action: str, target: str, reason: str = None):
    log = AdminActionLog(
        admin_id=admin_id,
        action=action,
        target=target,
        reason=reason
    )
    session.add(log)


@router.get("/admins", response_model=list[AdminManagementResponse])
async def list_admins(
    super_admin: Admin = Depends(get_current_super_admin),
    session: AsyncSession = Depends(get_db_session)
) -> list[AdminManagementResponse]:
    """List all administrators."""
    stmt = select(Admin).order_by(desc(Admin.created_at))
    result = await session.execute(stmt)
    admins = result.scalars().all()
    
    return [
        AdminManagementResponse(
            id=str(a.id),
            name=a.name,
            email=a.email,
            role=a.role.value,
            is_active=a.is_active,
            created_at=a.created_at.isoformat(),
            last_login=a.last_login.isoformat() if a.last_login else None
        ) for a in admins
    ]


@router.get("/requests", response_model=list[AdminRequestResponse])
async def list_admin_requests(
    super_admin: Admin = Depends(get_current_super_admin),
    session: AsyncSession = Depends(get_db_session)
) -> list[AdminRequestResponse]:
    """List all pending and rejected admin requests."""
    from app.models.admin_request import AdminRequest
    stmt = select(AdminRequest).order_by(desc(AdminRequest.created_at))
    result = await session.execute(stmt)
    requests = result.scalars().all()
    
    return [
        AdminRequestResponse(
            id=str(r.id),
            name=r.name,
            email=r.email,
            status=r.status.value,
            created_at=r.created_at.isoformat()
        ) for r in requests
    ]


@router.put("/requests/{request_id}/approve")
async def approve_admin_request(
    request_id: UUID,
    super_admin: Admin = Depends(get_current_super_admin),
    session: AsyncSession = Depends(get_db_session)
) -> dict[str, str]:
    """Approve an admin request and create the admin account."""
    from app.models.admin_request import AdminRequest, AdminRequestStatus
    
    req_result = await session.execute(select(AdminRequest).where(AdminRequest.id == request_id))
    admin_req = req_result.scalar_one_or_none()
    
    if not admin_req:
        raise AppError("not_found", "Request not found", 404)
        
    if admin_req.status == AdminRequestStatus.APPROVED:
        raise AppError("invalid_action", "Request is already approved", 400)
        
    existing_admin = await session.execute(select(Admin).where(Admin.email == admin_req.email))
    if existing_admin.scalar_one_or_none():
        raise AppError("email_in_use", "An admin with this email already exists", 409)
        
    admin_req.status = AdminRequestStatus.APPROVED
    
    new_admin = Admin(
        name=admin_req.name,
        email=admin_req.email,
        password_hash=admin_req.password_hash,
        role=AdminRole.ADMIN
    )
    session.add(new_admin)
    await session.flush()
    
    await _log_action(
        session,
        super_admin.id,
        "APPROVE_ADMIN",
        admin_req.email,
        "Approved pending admin request"
    )
    await session.commit()
    return {"status": "ok", "message": "Admin request approved successfully"}


@router.put("/requests/{request_id}/reject")
async def reject_admin_request(
    request_id: UUID,
    super_admin: Admin = Depends(get_current_super_admin),
    session: AsyncSession = Depends(get_db_session)
) -> dict[str, str]:
    """Reject an admin request."""
    from app.models.admin_request import AdminRequest, AdminRequestStatus
    
    req_result = await session.execute(select(AdminRequest).where(AdminRequest.id == request_id))
    admin_req = req_result.scalar_one_or_none()
    
    if not admin_req:
        raise AppError("not_found", "Request not found", 404)
        
    if admin_req.status == AdminRequestStatus.APPROVED:
        raise AppError("invalid_action", "Cannot reject an already approved request", 400)
        
    admin_req.status = AdminRequestStatus.REJECTED
    
    await _log_action(
        session,
        super_admin.id,
        "REJECT_ADMIN",
        admin_req.email,
        "Rejected admin request"
    )
    await session.commit()
    return {"status": "ok", "message": "Admin request rejected"}


@router.post("/admins", response_model=AdminCreateResponse)
async def create_admin(
    payload: AdminCreateRequest,
    super_admin: Admin = Depends(get_current_super_admin),
    session: AsyncSession = Depends(get_db_session)
) -> AdminCreateResponse:
    """Create a new admin and generate a temporary password."""
    email = payload.email.strip().lower()
    
    existing = await session.execute(select(Admin).where(Admin.email == email))
    if existing.scalar_one_or_none():
        raise AppError("email_in_use", "Email is already registered as an admin", 409)
        
    temp_password = secrets.token_urlsafe(12)
    settings = get_settings()
    password_hash = bcrypt.hashpw(temp_password.encode("utf-8"), bcrypt.gensalt(settings.password_hash_rounds)).decode("utf-8")
    
    new_admin = Admin(
        name=payload.name,
        email=email,
        role=payload.role,
        password_hash=password_hash
    )
    session.add(new_admin)
    await session.flush()
    
    await _log_action(
        session, 
        super_admin.id, 
        "CREATE_ADMIN", 
        email, 
        f"Provisioned new admin with role {payload.role.value}"
    )
    await session.commit()
    
    return AdminCreateResponse(
        admin=AdminManagementResponse(
            id=str(new_admin.id),
            name=new_admin.name,
            email=new_admin.email,
            role=new_admin.role.value,
            is_active=new_admin.is_active,
            created_at=new_admin.created_at.isoformat(),
            last_login=None
        ),
        temporary_password=temp_password
    )


@router.put("/admins/{admin_id}/role", response_model=AdminManagementResponse)
async def update_admin_role(
    admin_id: UUID,
    payload: AdminRoleUpdateRequest,
    super_admin: Admin = Depends(get_current_super_admin),
    session: AsyncSession = Depends(get_db_session)
) -> AdminManagementResponse:
    """Change an admin's role."""
    if admin_id == super_admin.id:
        raise AppError("invalid_action", "You cannot change your own role", 400)
        
    result = await session.execute(select(Admin).where(Admin.id == admin_id))
    target_admin = result.scalar_one_or_none()
    
    if not target_admin:
        raise AppError("not_found", "Admin not found", 404)
        
    old_role = target_admin.role
    target_admin.role = payload.role
    
    await _log_action(
        session, 
        super_admin.id, 
        "CHANGE_ROLE", 
        target_admin.email, 
        f"Changed role from {old_role.value} to {payload.role.value}"
    )
    await session.commit()
    
    return AdminManagementResponse(
        id=str(target_admin.id),
        name=target_admin.name,
        email=target_admin.email,
        role=target_admin.role.value,
        is_active=target_admin.is_active,
        created_at=target_admin.created_at.isoformat(),
        last_login=target_admin.last_login.isoformat() if target_admin.last_login else None
    )


@router.put("/admins/{admin_id}/deactivate", response_model=AdminManagementResponse)
async def toggle_admin_status(
    admin_id: UUID,
    super_admin: Admin = Depends(get_current_super_admin),
    session: AsyncSession = Depends(get_db_session)
) -> AdminManagementResponse:
    """Deactivate or Reactivate an admin."""
    if admin_id == super_admin.id:
        raise AppError("invalid_action", "You cannot deactivate yourself", 400)
        
    result = await session.execute(select(Admin).where(Admin.id == admin_id))
    target_admin = result.scalar_one_or_none()
    
    if not target_admin:
        raise AppError("not_found", "Admin not found", 404)
        
    target_admin.is_active = not target_admin.is_active
    status_str = "Reactivated" if target_admin.is_active else "Deactivated"
    
    await _log_action(
        session, 
        super_admin.id, 
        "TOGGLE_STATUS", 
        target_admin.email, 
        f"{status_str} admin account"
    )
    await session.commit()
    
    return AdminManagementResponse(
        id=str(target_admin.id),
        name=target_admin.name,
        email=target_admin.email,
        role=target_admin.role.value,
        is_active=target_admin.is_active,
        created_at=target_admin.created_at.isoformat(),
        last_login=target_admin.last_login.isoformat() if target_admin.last_login else None
    )


@router.post("/admins/{admin_id}/reset-password")
async def reset_admin_password(
    admin_id: UUID,
    super_admin: Admin = Depends(get_current_super_admin),
    session: AsyncSession = Depends(get_db_session)
) -> dict[str, str]:
    """Reset an admin's password and return a temporary one."""
    if admin_id == super_admin.id:
        raise AppError("invalid_action", "Please use the standard forgot password flow for your own account", 400)
        
    result = await session.execute(select(Admin).where(Admin.id == admin_id))
    target_admin = result.scalar_one_or_none()
    
    if not target_admin:
        raise AppError("not_found", "Admin not found", 404)
        
    temp_password = secrets.token_urlsafe(12)
    settings = get_settings()
    target_admin.password_hash = bcrypt.hashpw(temp_password.encode("utf-8"), bcrypt.gensalt(settings.password_hash_rounds)).decode("utf-8")
    
    await _log_action(
        session, 
        super_admin.id, 
        "RESET_PASSWORD", 
        target_admin.email, 
        "Forced password reset by Super Admin"
    )
    await session.commit()
    
    return {
        "status": "ok", 
        "temporary_password": temp_password,
        "message": f"Password reset for {target_admin.email}"
    }


@router.get("/logs", response_model=list[AdminActionLogResponse])
async def get_admin_action_logs(
    limit: int = 100,
    super_admin: Admin = Depends(get_current_super_admin),
    session: AsyncSession = Depends(get_db_session)
) -> list[AdminActionLogResponse]:
    """Get the immutable audit trail of admin actions."""
    stmt = (
        select(AdminActionLog, Admin)
        .join(Admin, AdminActionLog.admin_id == Admin.id)
        .order_by(desc(AdminActionLog.created_at))
        .limit(limit)
    )
    
    result = await session.execute(stmt)
    
    response = []
    for log, admin in result:
        response.append(
            AdminActionLogResponse(
                id=str(log.id),
                admin_email=admin.email,
                action=log.action,
                target=log.target,
                reason=log.reason,
                created_at=log.created_at.isoformat()
            )
        )
        
    return response
