"""add_order_index_to_custom_list_games

Revision ID: 4475cdaa4893
Revises: e539f80f775b
Create Date: 2026-07-19 12:09:51.611982

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4475cdaa4893'
down_revision: Union[str, Sequence[str], None] = 'e539f80f775b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "custom_list_games",
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("custom_list_games", "order_index")
