import os
import sys
from logging.config import fileConfig

from sqlalchemy import create_engine
from alembic import context

# Adiciona o diretório raiz ao path para conseguir importar os modelos
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import Base
from app.models import user, game, user_game, user_game_review, tierlist, custom_lists, email_verification, password_reset, steam_account, itch_account, follow, activity, patch_note  # noqa

target_metadata = Base.metadata

# Objecto de configuração do Alembic
config = context.config

# Logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# URL do banco
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./visualmemory.db")


def run_migrations_offline():
    """Modo offline: gera SQL sem ligar ao banco."""
    context.configure(
        url=DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    """Modo online: liga ao banco e executa as migrações."""
    if DATABASE_URL.startswith("sqlite"):
        connectable = create_engine(
            DATABASE_URL,
            connect_args={"check_same_thread": False},
        )
    else:
        connectable = create_engine(DATABASE_URL)

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_as_batch=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()