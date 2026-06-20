"""add study sessions table

Revision ID: abc123def456
Revises: 56b6ac115298
Create Date: 2026-06-07 18:44:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "abc123def456"
down_revision = "56b6ac115298"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "study_sessions",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "is_deleted",
            sa.Boolean(),
            nullable=False,
            server_default="false",
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),

        # FIXED: removed index=True
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("feature_used", sa.String(length=32), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),

        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "duration_seconds",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),

        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "ix_study_sessions_user_id",
        "study_sessions",
        ["user_id"],
    )

    op.create_index(
        "ix_study_sessions_feature_used",
        "study_sessions",
        ["feature_used"],
    )

    op.create_index(
        "ix_study_sessions_started_at",
        "study_sessions",
        ["started_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_study_sessions_started_at",
        table_name="study_sessions",
    )

    op.drop_index(
        "ix_study_sessions_feature_used",
        table_name="study_sessions",
    )

    op.drop_index(
        "ix_study_sessions_user_id",
        table_name="study_sessions",
    )

    op.drop_table("study_sessions")