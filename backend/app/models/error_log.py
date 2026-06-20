"""Error log model."""

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class ErrorLog(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """ErrorLog ORM model for DevOps monitoring."""

    __tablename__ = "error_logs"

    module: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
