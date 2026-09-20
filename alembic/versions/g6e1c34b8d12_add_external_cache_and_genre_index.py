"""add external API cache and PostgreSQL genre index

Revision ID: g6e1c34b8d12
Revises: f5d9b23a7c01
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "g6e1c34b8d12"
down_revision: str | None = "f5d9b23a7c01"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "external_api_cache",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("provider", sa.String(length=40), nullable=False),
        sa.Column("cache_key", sa.String(length=255), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_external_api_cache")),
        sa.UniqueConstraint("provider", "cache_key", name="uq_external_api_cache_provider_key"),
    )
    op.create_index(op.f("ix_external_api_cache_provider"), "external_api_cache", ["provider"])
    op.create_index(op.f("ix_external_api_cache_expires_at"), "external_api_cache", ["expires_at"])
    if op.get_bind().dialect.name == "postgresql":
        op.execute("CREATE INDEX ix_games_genres_gin ON games USING gin ((genres::jsonb))")


def downgrade() -> None:
    if op.get_bind().dialect.name == "postgresql":
        op.execute("DROP INDEX IF EXISTS ix_games_genres_gin")
    op.drop_index(op.f("ix_external_api_cache_expires_at"), table_name="external_api_cache")
    op.drop_index(op.f("ix_external_api_cache_provider"), table_name="external_api_cache")
    op.drop_table("external_api_cache")
