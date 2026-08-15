"""change_store_column_to_varchar

Revision ID: a89d3f124b10
Revises: 8cb04cfc93c9
Create Date: 2026-08-15 19:35:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a89d3f124b10'
down_revision: Union[str, Sequence[str], None] = '8cb04cfc93c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == 'postgresql':
        op.execute("ALTER TABLE user_games ALTER COLUMN store TYPE VARCHAR USING store::VARCHAR;")
    else:
        with op.batch_alter_table('user_games', schema=None) as batch_op:
            batch_op.alter_column(
                'store',
                type_=sa.String(),
                existing_nullable=True,
            )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == 'postgresql':
        op.execute("ALTER TABLE user_games ALTER COLUMN store TYPE store USING store::store;")
    else:
        with op.batch_alter_table('user_games', schema=None) as batch_op:
            batch_op.alter_column(
                'store',
                type_=sa.Enum(
                    'STEAM', 'EPIC', 'GOG', 'ITCH', 'PS_STORE', 'XBOX',
                    'NINTENDO', 'GOOGLE_PLAY', 'APP_STORE', 'PHYSICAL', 'OTHER',
                    name='store'
                ),
                existing_nullable=True,
            )
