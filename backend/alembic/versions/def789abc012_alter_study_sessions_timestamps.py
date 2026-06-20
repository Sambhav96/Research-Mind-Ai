"""alter study_sessions timestamps to timezone-aware

Revision ID: def789abc012
Revises: abc123def456
Create Date: 2026-06-07 20:17:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import TIMESTAMP as PG_TIMESTAMP


revision = "def789abc012"
down_revision = "abc123def456"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "study_sessions",
        "started_at",
        existing_type=sa.DateTime(timezone=False),
        type_=PG_TIMESTAMP(timezone=True),
        existing_nullable=False,
    )
    op.alter_column(
        "study_sessions",
        "ended_at",
        existing_type=sa.DateTime(timezone=True),
        type_=PG_TIMESTAMP(timezone=True),
        existing_nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "study_sessions",
        "started_at",
        existing_type=PG_TIMESTAMP(timezone=True),
        type_=sa.DateTime(timezone=False),
        existing_nullable=False,
    )
    op.alter_column(
        "study_sessions",
        "ended_at",
        existing_type=PG_TIMESTAMP(timezone=True),
        type_=sa.DateTime(timezone=True),
        existing_nullable=True,
    )
