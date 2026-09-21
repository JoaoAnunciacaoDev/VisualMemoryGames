import os

PRODUCTION_SECRET_PLACEHOLDERS = {
    "your_secret_key",
    "dev-secret-key-for-development-only",
    "change-me",
    "changeme",
    "replace_with_a_random_secret_of_at_least_32_characters",
}


def _is_placeholder(value: str) -> bool:
    normalized = value.strip().lower()
    return (
        not normalized
        or normalized.startswith(("your_", "replace_"))
        or normalized
        in {
            "change-me",
            "changeme",
        }
    )


def validate_runtime_configuration() -> None:
    """Falha cedo quando uma configuração insegura é usada em produção."""
    environment = os.getenv("ENVIRONMENT", "development").strip().lower()

    if os.getenv("RENDER") and environment != "production":
        raise RuntimeError("No Render, configure ENVIRONMENT=production.")

    if environment != "production":
        return

    errors: list[str] = []

    secret_key = os.getenv("SECRET_KEY", "").strip()
    if (
        len(secret_key) < 32
        or secret_key.lower() in PRODUCTION_SECRET_PLACEHOLDERS
        or _is_placeholder(secret_key)
    ):
        errors.append("SECRET_KEY deve ter pelo menos 32 caracteres e não pode ser um placeholder")

    database_url = os.getenv("DATABASE_URL", "").strip()
    if not database_url:
        errors.append("DATABASE_URL é obrigatória")
    elif not database_url.lower().startswith(("postgresql://", "postgres://")):
        errors.append("DATABASE_URL deve apontar para PostgreSQL em produção")
    elif "user:pass@host" in database_url.lower():
        errors.append("DATABASE_URL não pode usar o valor de exemplo")

    storage_provider = os.getenv("STORAGE_PROVIDER", "").strip().lower()
    if storage_provider != "s3":
        errors.append("STORAGE_PROVIDER deve ser 's3' em produção")
    else:
        for variable in ("STORAGE_ACCESS_KEY", "STORAGE_SECRET_KEY", "STORAGE_BUCKET"):
            if _is_placeholder(os.getenv(variable, "")):
                errors.append(f"{variable} é obrigatória quando STORAGE_PROVIDER=s3")
        public_base_url = os.getenv("STORAGE_PUBLIC_BASE_URL", "").strip()
        if public_base_url and _is_placeholder(public_base_url):
            errors.append("STORAGE_PUBLIC_BASE_URL não pode usar o valor de exemplo")

    brevo_api_key = os.getenv("BREVO_API_KEY", "")
    resend_api_key = os.getenv("RESEND_API_KEY", "")
    smtp_variables = ("SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD")
    smtp_configured = all(
        not _is_placeholder(os.getenv(variable, "")) for variable in smtp_variables
    )
    http_email_configured = not _is_placeholder(brevo_api_key) or not _is_placeholder(
        resend_api_key
    )
    if os.getenv("RENDER") and not http_email_configured:
        errors.append("BREVO_API_KEY ou RESEND_API_KEY é obrigatória no Render")
    elif not http_email_configured and not smtp_configured:
        errors.append("configure Brevo, Resend ou todas as variáveis SMTP para envio de e-mail")

    for variable, default in (
        ("ACCESS_TOKEN_EXPIRE_MINUTES", "60"),
        ("REMEMBER_ME_EXPIRE_DAYS", "7"),
    ):
        try:
            if int(os.getenv(variable, default).strip()) <= 0:
                raise ValueError
        except ValueError:
            errors.append(f"{variable} deve ser um inteiro positivo")

    if errors:
        details = "; ".join(errors)
        raise RuntimeError(f"Configuração de produção inválida: {details}.")
