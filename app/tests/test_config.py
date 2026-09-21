import pytest

from app.config import validate_runtime_configuration

PRODUCTION_VARIABLES = (
    "RENDER",
    "SECRET_KEY",
    "DATABASE_URL",
    "STORAGE_PROVIDER",
    "STORAGE_ACCESS_KEY",
    "STORAGE_SECRET_KEY",
    "STORAGE_BUCKET",
    "STORAGE_PUBLIC_BASE_URL",
    "ACCESS_TOKEN_EXPIRE_MINUTES",
    "REMEMBER_ME_EXPIRE_DAYS",
    "BREVO_API_KEY",
    "RESEND_API_KEY",
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASSWORD",
)


def clear_production_environment(monkeypatch):
    for variable in PRODUCTION_VARIABLES:
        monkeypatch.delenv(variable, raising=False)


def test_development_does_not_require_production_services(monkeypatch):
    clear_production_environment(monkeypatch)
    monkeypatch.setenv("ENVIRONMENT", "development")

    validate_runtime_configuration()


def test_render_requires_explicit_production_environment(monkeypatch):
    clear_production_environment(monkeypatch)
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.setenv("RENDER", "true")

    with pytest.raises(RuntimeError, match="ENVIRONMENT=production"):
        validate_runtime_configuration()


def test_production_rejects_insecure_configuration_without_echoing_secrets(monkeypatch):
    clear_production_environment(monkeypatch)
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("SECRET_KEY", "short-secret")
    monkeypatch.setenv("DATABASE_URL", "sqlite:///production.db")
    monkeypatch.setenv("STORAGE_PROVIDER", "local")
    monkeypatch.setenv("ACCESS_TOKEN_EXPIRE_MINUTES", "0")

    with pytest.raises(RuntimeError) as exc_info:
        validate_runtime_configuration()

    message = str(exc_info.value)
    assert "SECRET_KEY" in message
    assert "DATABASE_URL" in message
    assert "STORAGE_PROVIDER" in message
    assert "ACCESS_TOKEN_EXPIRE_MINUTES" in message
    assert "short-secret" not in message
    assert "production.db" not in message


def test_valid_production_configuration(monkeypatch):
    clear_production_environment(monkeypatch)
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("RENDER", "true")
    monkeypatch.setenv("SECRET_KEY", "a-secure-production-secret-with-32-characters")
    monkeypatch.setenv("DATABASE_URL", "postgresql://user:password@db.internal/app")
    monkeypatch.setenv("STORAGE_PROVIDER", "s3")
    monkeypatch.setenv("STORAGE_ACCESS_KEY", "access-key")
    monkeypatch.setenv("STORAGE_SECRET_KEY", "storage-secret")
    monkeypatch.setenv("STORAGE_BUCKET", "covers")
    monkeypatch.setenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60")
    monkeypatch.setenv("REMEMBER_ME_EXPIRE_DAYS", "7")
    monkeypatch.setenv("BREVO_API_KEY", "valid-brevo-key")

    validate_runtime_configuration()
