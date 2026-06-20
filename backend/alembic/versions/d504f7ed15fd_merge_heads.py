"""merge heads

Revision ID: d504f7ed15fd
Revises: aba3dc3bfb14, def789abc012
Create Date: 2026-06-11 17:48:49.688019
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = 'd504f7ed15fd'
down_revision = ('aba3dc3bfb14', 'def789abc012')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
