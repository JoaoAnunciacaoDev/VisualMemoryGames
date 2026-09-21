"""add user token version for session revocation

Revision ID: a7c92e1f4b31
Revises: g6e1c34b8d12
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "a7c92e1f4b31"
down_revision: str | None = "g6e1c34b8d12"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("token_version", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("users", "token_version")
