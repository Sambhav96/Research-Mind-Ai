"""Add embedding_v2 Vector(3072) column for Gemini embeddings.

Zero-downtime strategy:
  1. Add embedding_v2 column (3072 dims) — old embedding column preserved.
  2. Application switches to reading/writing embedding_v2.
  3. Re-embedding script populates embedding_v2 for all chunks.
  4. After validation, a separate migration drops the old embedding column.

Revision ID: add_embedding_v2_3072
"""

from alembic import op
import sqlalchemy as sa

revision = "add_embedding_v2_3072"
down_revision = ("add_user_name", "add_page_count")
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add the new 3072-dim column alongside the existing 1536-dim column
    op.execute("ALTER TABLE chunks ADD COLUMN IF NOT EXISTS embedding_v2 vector(3072)")


def downgrade() -> None:
    # Simply drop the new column — old embedding column is untouched
    op.execute("ALTER TABLE chunks DROP COLUMN IF EXISTS embedding_v2")
