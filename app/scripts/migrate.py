"""Executa migrações serializadas para evitar corrida entre deploys."""

from alembic.config import Config
from sqlalchemy import create_engine, text

from alembic import command
from app.database import DATABASE_URL

LOCK_ID = 861_947_235


def main() -> None:
    engine = create_engine(DATABASE_URL)
    with engine.connect() as connection:
        is_postgresql = connection.dialect.name == "postgresql"
        if is_postgresql:
            connection.execute(text("SELECT pg_advisory_lock(:lock_id)"), {"lock_id": LOCK_ID})
            connection.commit()
        try:
            config = Config("alembic.ini")
            config.attributes["connection"] = connection
            command.upgrade(config, "head")
        finally:
            if is_postgresql:
                connection.execute(
                    text("SELECT pg_advisory_unlock(:lock_id)"), {"lock_id": LOCK_ID}
                )
                connection.commit()


if __name__ == "__main__":
    main()
