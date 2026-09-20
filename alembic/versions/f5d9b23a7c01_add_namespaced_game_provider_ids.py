"""add namespaced game provider ids

Revision ID: f5d9b23a7c01
Revises: e4c8a12f6b90
Create Date: 2026-09-20 18:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "f5d9b23a7c01"
down_revision: str | Sequence[str] | None = "e4c8a12f6b90"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "game_provider_ids",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("game_id", sa.String(), nullable=False),
        sa.Column("provider", sa.String(length=32), nullable=False),
        sa.Column("external_id", sa.String(length=255), nullable=False),
        sa.ForeignKeyConstraint(
            ["game_id"], ["games.id"], name="fk_game_provider_ids_game_id_games", ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name="pk_game_provider_ids"),
        sa.UniqueConstraint(
            "provider",
            "external_id",
            name="uq_game_provider_ids_provider_external_id",
        ),
    )
    op.create_index(
        "ix_game_provider_ids_game_id", "game_provider_ids", ["game_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index("ix_game_provider_ids_game_id", table_name="game_provider_ids")
    op.drop_table("game_provider_ids")
