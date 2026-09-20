import logging

from uvicorn.logging import AccessFormatter

from app.logging_utils import SensitiveDataFilter, redact_sensitive, safe_database_target


def test_redact_sensitive_values():
    message = (
        "postgresql://user:db-password@db.internal/app "
        "Bearer header.payload.signature "
        "https://example.test?api_key=rawg-secret&token=access-secret "
        "Código: 123456"
    )

    sanitized = redact_sensitive(message)

    for secret in (
        "db-password",
        "header.payload.signature",
        "rawg-secret",
        "access-secret",
        "123456",
    ):
        assert secret not in sanitized
    assert sanitized.count("[REDACTED]") >= 5


def test_safe_database_target_omits_credentials_and_query_parameters():
    target = safe_database_target(
        "postgresql://database-user:database-password@db.internal:5432/visualmemory?sslmode=require"
    )

    assert target == "db.internal:5432/visualmemory"
    assert "database-user" not in target
    assert "database-password" not in target
    assert "sslmode" not in target


def test_sensitive_filter_preserves_uvicorn_access_log_arguments():
    record = logging.LogRecord(
        "uvicorn.access",
        logging.INFO,
        __file__,
        1,
        '%s - "%s %s HTTP/%s" %d',
        ("127.0.0.1:123", "GET", "/health?token=secret", "1.1", 200),
        None,
    )

    assert SensitiveDataFilter().filter(record) is True
    formatted = AccessFormatter().format(record)
    assert "secret" not in formatted
    assert "[REDACTED]" in formatted
    assert "200" in formatted
