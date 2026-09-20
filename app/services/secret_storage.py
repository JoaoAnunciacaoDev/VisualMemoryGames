from __future__ import annotations

import base64
import hashlib
import os

from cryptography.fernet import Fernet, InvalidToken

PREFIX = "enc:v1:"


class SecretDecryptionError(ValueError):
    pass


def _cipher() -> Fernet:
    secret_key = os.getenv("SECRET_KEY", "")
    if not secret_key:
        raise RuntimeError("SECRET_KEY é obrigatória para criptografar credenciais.")
    derived_key = base64.urlsafe_b64encode(hashlib.sha256(secret_key.encode()).digest())
    return Fernet(derived_key)


def encrypt_secret(value: str) -> str:
    if not value:
        raise ValueError("Não é possível criptografar um segredo vazio.")
    if value.startswith(PREFIX):
        return value
    encrypted = _cipher().encrypt(value.encode()).decode()
    return f"{PREFIX}{encrypted}"


def decrypt_secret(value: str) -> tuple[str, bool]:
    """Retorna o segredo e indica se o valor legado ainda estava em texto puro."""
    if not value.startswith(PREFIX):
        return value, True
    try:
        return _cipher().decrypt(value.removeprefix(PREFIX).encode()).decode(), False
    except InvalidToken as exc:
        raise SecretDecryptionError(
            "Não foi possível descriptografar a credencial armazenada."
        ) from exc


def encrypt_legacy_itch_tokens(db) -> int:
    from app.models.itch_account import ItchAccount

    accounts = db.query(ItchAccount).filter(~ItchAccount.access_token.startswith(PREFIX)).all()
    for account in accounts:
        account.access_token = encrypt_secret(str(account.access_token))
    if accounts:
        db.commit()
    return len(accounts)
