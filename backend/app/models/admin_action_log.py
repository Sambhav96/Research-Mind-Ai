"""Admin action log model."""

from uuid import UUID

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class AdminActionLog(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """AdminActionLog ORM model for audit trails."""

    __tablename__ = "admin_action_logs"

    admin_id: Mapped[UUID] = mapped_column(ForeignKey("admins.id", ondelete="CASCADE"), index=True, nullable=False)
    action: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    target: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
