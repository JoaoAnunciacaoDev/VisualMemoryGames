"""add last_active_at to user

Revision ID: ccf09b148d4e
Revises: fc5ca79a7ff7
Create Date: 2026-07-08 22:12:01.375160

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ccf09b148d4e'
down_revision: Union[str, Sequence[str], None] = 'fc5ca79a7ff7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('last_active_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'last_active_at')
