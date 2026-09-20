from app.database import build_engine_options


def test_sqlite_engine_options_remain_compatible():
    options = build_engine_options("sqlite:///:memory:")
    assert options == {"connect_args": {"check_same_thread": False}, "echo": False}


def test_postgres_pool_is_bounded(monkeypatch):
    monkeypatch.setenv("DB_POOL_SIZE", "3")
    monkeypatch.setenv("DB_MAX_OVERFLOW", "2")
    monkeypatch.setenv("DB_POOL_TIMEOUT", "10")
    monkeypatch.setenv("DB_POOL_RECYCLE", "300")
    monkeypatch.setenv("DB_STATEMENT_TIMEOUT_MS", "25000")

    options = build_engine_options("postgresql://user:password@db/app")

    assert options["pool_size"] == 3
    assert options["max_overflow"] == 2
    assert options["pool_timeout"] == 10
    assert options["pool_pre_ping"] is True
    assert options["pool_recycle"] == 300
    assert options["connect_args"] == {"options": "-c statement_timeout=25000"}
