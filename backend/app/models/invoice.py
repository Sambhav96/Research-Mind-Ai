"""Invoice model."""

from uuid import UUID

from sqlalchemy import Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class Invoice(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Invoice ORM model for simulated billing."""

    __tablename__ = "invoices"

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="Success", nullable=False)
    plan: Mapped[str] = mapped_column(String(32), nullable=False)
