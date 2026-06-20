"""Add page_count to documents

Revision ID: add_page_count
Revises: 59e90c28c67b
Create Date: 2026-06-03 17:30:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = 'add_page_count'
down_revision = "add_processing_progress"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('documents', sa.Column('page_count', sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('documents', 'page_count')