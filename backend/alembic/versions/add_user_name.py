"""Add user name column

Revision ID: add_user_name
Revises: 5b754b123b63
Create Date: 2026-06-03 17:00:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = 'add_user_name'
down_revision = "59e90c28c67b"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('name', sa.String(length=256), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'name')