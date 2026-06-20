"""Add processing_progress to documents table."""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "add_processing_progress"
down_revision = "59e90c28c67b"
depends_on = None


def upgrade() -> None:
    op.add_column(
        "documents",
        sa.Column("processing_progress", sa.Integer(), nullable=False, server_default="0"),
    )
    op.alter_column("documents", "processing_progress", server_default=None)


def downgrade() -> None:
    op.drop_column("documents", "processing_progress")
