import logging
import os
import time
from typing import Any

from sqlalchemy import MetaData, create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.logging_utils import safe_database_target

logger = logging.getLogger("visualmemory.database")

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./visualmemory.db")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)


def _positive_int_env(name: str, default: int, minimum: int = 1) -> int:
    try:
        return max(minimum, int(os.getenv(name, str(default))))
    except ValueError:
        logger.warning("%s inválida; usando %s.", name, default)
        return default


def build_engine_options(database_url: str) -> dict[str, Any]:
    if database_url.startswith("sqlite"):
        return {"connect_args": {"check_same_thread": False}, "echo": False}

    statement_timeout_ms = _positive_int_env("DB_STATEMENT_TIMEOUT_MS", 30_000, 1_000)
    return {
        "echo": False,
        "pool_size": _positive_int_env("DB_POOL_SIZE", 3),
        "max_overflow": _positive_int_env("DB_MAX_OVERFLOW", 2, 0),
        "pool_timeout": _positive_int_env("DB_POOL_TIMEOUT", 10),
        "pool_pre_ping": True,
        "pool_recycle": _positive_int_env("DB_POOL_RECYCLE", 300),
        "connect_args": {"options": f"-c statement_timeout={statement_timeout_ms}"},
    }


engine = create_engine(DATABASE_URL, **build_engine_options(DATABASE_URL))

if DATABASE_URL.startswith("sqlite"):

    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
else:
    logger.info("Conectando ao PostgreSQL em %s", safe_database_target(DATABASE_URL))


slow_query_ms = _positive_int_env("DB_SLOW_QUERY_MS", 500)


@event.listens_for(engine, "before_cursor_execute")
def track_query_start(conn, cursor, statement, parameters, context, executemany):
    conn.info.setdefault("query_started_at", []).append(time.perf_counter())


@event.listens_for(engine, "after_cursor_execute")
def log_slow_query(conn, cursor, statement, parameters, context, executemany):
    started = conn.info.get("query_started_at", [])
    if not started:
        return
    started_at = started.pop()
    duration_ms = (time.perf_counter() - started_at) * 1000
    if duration_ms >= slow_query_ms:
        operation = statement.lstrip().split(None, 1)[0].upper() if statement.strip() else "QUERY"
        logger.warning("Query lenta: operation=%s duration_ms=%.1f", operation, duration_ms)


@event.listens_for(engine, "handle_error")
def clear_failed_query_timer(exception_context):
    connection = exception_context.connection
    if connection is None:
        return
    started = connection.info.get("query_started_at", [])
    if started:
        started.pop()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

naming_convention = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=naming_convention)


def get_db():
    """Fornece uma sessão de base de dados por pedido."""
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
