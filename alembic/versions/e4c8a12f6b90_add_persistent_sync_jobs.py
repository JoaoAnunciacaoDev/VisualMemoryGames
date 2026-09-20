"""add persistent sync jobs

Revision ID: e4c8a12f6b90
Revises: d3b7f91e2a4c
Create Date: 2026-09-20 16:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "e4c8a12f6b90"
down_revision: str | Sequence[str] | None = "d3b7f91e2a4c"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "sync_jobs",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("job_type", sa.String(length=80), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("result", sa.JSON(), nullable=True),
        sa.Column("progress", sa.Integer(), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("max_attempts", sa.Integer(), nullable=False),
        sa.Column("idempotency_key", sa.String(length=255), nullable=True),
        sa.Column("available_at", sa.DateTime(), nullable=False),
        sa.Column("locked_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("finished_at", sa.DateTime(), nullable=True),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name="fk_sync_jobs_user_id_users", ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name="pk_sync_jobs"),
    )
    op.create_index(
        "ix_sync_jobs_status_available_at",
        "sync_jobs",
        ["status", "available_at"],
    )
    op.create_index(
        "ix_sync_jobs_user_created_at",
        "sync_jobs",
        ["user_id", "created_at"],
    )
    op.create_index(
        "uq_sync_jobs_active_idempotency_key",
        "sync_jobs",
        ["idempotency_key"],
        unique=True,
        postgresql_where=sa.text(
            "idempotency_key IS NOT NULL AND status IN ('pending', 'running')"
        ),
        sqlite_where=sa.text(
            "idempotency_key IS NOT NULL AND status IN ('pending', 'running')"
        ),
    )


def downgrade() -> None:
    op.drop_index("uq_sync_jobs_active_idempotency_key", table_name="sync_jobs")
    op.drop_index("ix_sync_jobs_user_created_at", table_name="sync_jobs")
    op.drop_index("ix_sync_jobs_status_available_at", table_name="sync_jobs")
    op.drop_table("sync_jobs")
