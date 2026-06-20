"""User metadata model."""

from uuid import UUID

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class UserMetadata(Base):
    """Stores extended user properties (plan, research score) that avoids locking users table."""

    __tablename__ = "user_metadata"

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    plan: Mapped[str] = mapped_column(String(32), default="free", nullable=False)
    research_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
