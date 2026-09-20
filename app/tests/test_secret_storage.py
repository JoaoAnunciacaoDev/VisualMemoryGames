import pytest

from app.models.itch_account import ItchAccount
from app.models.user import User
from app.services.secret_storage import (
    PREFIX,
    SecretDecryptionError,
    decrypt_secret,
    encrypt_legacy_itch_tokens,
    encrypt_secret,
)


def test_secret_round_trip_uses_authenticated_encryption(monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "production-secret-with-more-than-32-characters")
    encrypted = encrypt_secret("itch-access-token")

    assert encrypted.startswith(PREFIX)
    assert "itch-access-token" not in encrypted
    assert decrypt_secret(encrypted) == ("itch-access-token", False)


def test_plaintext_secret_is_identified_for_lazy_migration(monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "production-secret-with-more-than-32-characters")
    assert decrypt_secret("legacy-token") == ("legacy-token", True)


def test_encrypted_secret_rejects_a_different_secret_key(monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "first-production-secret-with-32-characters")
    encrypted = encrypt_secret("itch-access-token")
    monkeypatch.setenv("SECRET_KEY", "second-production-secret-with-32-characters")

    with pytest.raises(SecretDecryptionError):
        decrypt_secret(encrypted)


def test_existing_itch_tokens_are_migrated_without_changing_the_secret(
    db_session, auth_headers, monkeypatch
):
    monkeypatch.setenv("SECRET_KEY", "production-secret-with-more-than-32-characters")
    user = db_session.query(User).filter(User.username == "tester").one()
    account = ItchAccount(
        user_id=user.id,
        itch_id="itch-user",
        username="itch-user",
        access_token="legacy-token",
    )
    db_session.add(account)
    db_session.commit()

    assert encrypt_legacy_itch_tokens(db_session) == 1
    db_session.refresh(account)
    assert account.access_token.startswith(PREFIX)
    assert decrypt_secret(account.access_token) == ("legacy-token", False)
