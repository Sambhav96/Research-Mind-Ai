"""Admin billing demo routes."""

from __future__ import annotations

import random
from datetime import datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.models.admin import Admin
from app.models.invoice import Invoice
from app.models.user import User
from app.models.user_metadata import UserMetadata
from app.services.admin_auth import get_current_admin_entity

router = APIRouter(prefix="/admin/billing", tags=["admin_billing"])

# --- Schemas ---

class BillingStatsResponse(BaseModel):
    mrr: float
    active_subscriptions: int
    pending_invoices: int

class SubscriptionInfo(BaseModel):
    id: str
    user_id: str
    user_name: str | None
    user_email: str
    plan: str
    status: str
    created_at: str

class InvoiceInfo(BaseModel):
    id: str
    user_name: str | None
    user_email: str
    amount: float
    status: str
    date: str

class AssignPlanRequest(BaseModel):
    plan: str

# --- Endpoints ---

@router.get("/stats", response_model=BillingStatsResponse)
async def get_billing_stats(
    admin: Admin = Depends(get_current_admin_entity),
    session: AsyncSession = Depends(get_db_session)
) -> BillingStatsResponse:
    """Get real stats for billing."""
    # Count how many users have pro or enterprise plan
    stmt = select(UserMetadata).where(UserMetadata.plan.in_(["pro", "team", "enterprise"]))
    result = await session.execute(stmt)
    paid_users = len(result.scalars().all())
    
    # Calculate MRR based on plans
    stmt_all = select(UserMetadata)
    res_all = await session.execute(stmt_all)
    all_meta = res_all.scalars().all()
    
    mrr = 0.0
    active_subs = 0
    for meta in all_meta:
        if meta.plan in ["pro", "research_pro"]:
            mrr += 19.0
            active_subs += 1
        elif meta.plan in ["team", "research_team"]:
            mrr += 49.0
            active_subs += 1
        elif meta.plan == "enterprise":
            mrr += 149.0
            active_subs += 1

    # Count pending invoices
    stmt_inv = select(Invoice).where(Invoice.status == "Pending")
    res_inv = await session.execute(stmt_inv)
    pending_invoices = len(res_inv.scalars().all())

    return BillingStatsResponse(
        mrr=mrr,
        active_subscriptions=active_subs,
        pending_invoices=pending_invoices
    )


@router.get("/subscriptions", response_model=list[SubscriptionInfo])
async def get_subscriptions(
    admin: Admin = Depends(get_current_admin_entity),
    session: AsyncSession = Depends(get_db_session)
) -> list[SubscriptionInfo]:
    """Get all users and their subscription info."""
    stmt = select(User, UserMetadata).outerjoin(UserMetadata, User.id == UserMetadata.user_id)
    result = await session.execute(stmt)
    
    subs = []
    for user, meta in result:
        plan = meta.plan if meta else "free"
        
        status = "Active"
        if plan == "free":
            status = "None"

        subs.append(SubscriptionInfo(
            id=f"sub_{user.id.hex[:8]}",
            user_id=str(user.id),
            user_name=user.name,
            user_email=user.email,
            plan=plan,
            status=status,
            created_at=user.created_at.isoformat()
        ))
    return subs


@router.get("/invoices", response_model=list[InvoiceInfo])
async def get_invoices(
    admin: Admin = Depends(get_current_admin_entity),
    session: AsyncSession = Depends(get_db_session)
) -> list[InvoiceInfo]:
    """Fetch real invoices from database."""
    stmt = select(Invoice, User).join(User, Invoice.user_id == User.id).order_by(Invoice.created_at.desc()).limit(50)
    result = await session.execute(stmt)
    
    invoices = []
    for inv, user in result:
        invoices.append(InvoiceInfo(
            id=str(inv.id),
            user_name=user.name,
            user_email=user.email,
            amount=inv.amount,
            status=inv.status,
            date=inv.created_at.isoformat()
        ))
    
    return invoices


@router.post("/assign-plan/{user_id}", status_code=status.HTTP_200_OK)
async def assign_plan(
    user_id: UUID,
    request: AssignPlanRequest,
    admin: Admin = Depends(get_current_admin_entity),
    session: AsyncSession = Depends(get_db_session)
) -> dict[str, str]:
    """Update user's plan in UserMetadata."""
    plan = request.plan.lower()
    if plan not in ["free", "pro", "research_pro", "team", "research_team", "enterprise"]:
        raise HTTPException(status_code=400, detail="Invalid plan")

    # Check if meta exists
    stmt = select(UserMetadata).where(UserMetadata.user_id == user_id)
    result = await session.execute(stmt)
    meta = result.scalar_one_or_none()

    if meta:
        meta.plan = plan
    else:
        meta = UserMetadata(user_id=user_id, plan=plan, research_score=0)
        session.add(meta)
        
    # Create an override invoice for the ledger
    invoice = Invoice(
        user_id=user_id,
        amount=0.0,
        status="Success",
        plan=plan
    )
    session.add(invoice)
        
    await session.commit()
    return {"status": "ok", "message": f"Assigned {plan} plan"}
