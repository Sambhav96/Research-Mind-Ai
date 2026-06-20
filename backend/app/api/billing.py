"""User billing routes."""

from __future__ import annotations

from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.models.invoice import Invoice
from app.models.user import User
from app.models.user_metadata import UserMetadata
from app.services.auth import get_current_user_entity

router = APIRouter(prefix="/billing", tags=["billing"])

class UpgradeRequest(BaseModel):
    planId: str
    amount: float

class InvoiceInfo(BaseModel):
    id: str
    amount: float
    status: str
    date: str
    plan: str

class BillingInfoResponse(BaseModel):
    plan: str
    invoices: list[InvoiceInfo]

@router.get("/info", response_model=BillingInfoResponse)
async def get_billing_info(
    user: User = Depends(get_current_user_entity),
    session: AsyncSession = Depends(get_db_session)
) -> Any:
    """Get user's current plan and invoices."""
    # Get user metadata
    stmt = select(UserMetadata).where(UserMetadata.user_id == user.id)
    result = await session.execute(stmt)
    meta = result.scalar_one_or_none()
    plan = meta.plan if meta else "free"

    # Get invoices
    stmt_inv = select(Invoice).where(Invoice.user_id == user.id).order_by(Invoice.created_at.desc())
    res_inv = await session.execute(stmt_inv)
    invoices = res_inv.scalars().all()

    inv_list = [
        InvoiceInfo(
            id=str(inv.id),
            amount=inv.amount,
            status=inv.status,
            date=inv.created_at.isoformat(),
            plan=inv.plan
        )
        for inv in invoices
    ]

    return BillingInfoResponse(plan=plan, invoices=inv_list)


@router.post("/upgrade")
async def upgrade_plan(
    request: UpgradeRequest,
    user: User = Depends(get_current_user_entity),
    session: AsyncSession = Depends(get_db_session)
) -> dict[str, str]:
    """Upgrade user's plan and create a payment invoice."""
    plan = request.planId.lower()
    if plan not in ["free", "pro", "research_pro", "team", "research_team", "enterprise"]:
        raise HTTPException(status_code=400, detail="Invalid plan")

    # Update or create user metadata
    stmt = select(UserMetadata).where(UserMetadata.user_id == user.id)
    result = await session.execute(stmt)
    meta = result.scalar_one_or_none()

    if meta:
        meta.plan = plan
    else:
        meta = UserMetadata(user_id=user.id, plan=plan, research_score=0)
        session.add(meta)

    # Create Invoice
    invoice = Invoice(
        user_id=user.id,
        amount=request.amount,
        status="Success",
        plan=plan
    )
    session.add(invoice)

    await session.commit()
    return {"status": "ok"}
