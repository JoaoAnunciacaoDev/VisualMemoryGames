from datetime import datetime, timedelta

from app.models.password_reset import PasswordReset


def test_password_reset_success(client):
    # 1. Registrar um usuário
    client.post(
        "/users/register/initiate",
        json={
            "username": "resetuser",
            "email": "reset@visualmemory.com",
            "password": "Password123!",
        },
    )
    client.post(
        "/users/",
        json={
            "username": "resetuser",
            "email": "reset@visualmemory.com",
            "password": "Password123!",
            "code": "123456",
        },
    )

    # 2. Iniciar a redefinição de senha
    init_resp = client.post(
        "/password-reset/initiate",
        json={"email": "reset@visualmemory.com"},
    )
    assert init_resp.status_code == 200
    assert "código de redefinição foi enviado" in init_resp.json()["message"]

    # 3. Confirmar a nova senha usando o código estático "654321"
    confirm_resp = client.post(
        "/password-reset/confirm",
        json={
            "email": "reset@visualmemory.com",
            "code": "654321",
            "new_password": "NewPassword123!",
        },
    )
    assert confirm_resp.status_code == 200
    assert "Senha redefinida com sucesso" in confirm_resp.json()["message"]

    # 4. Tentar logar com a senha antiga (deve falhar)
    login_old = client.post(
        "/login",
        data={"username": "resetuser", "password": "Password123!"},
    )
    assert login_old.status_code == 401

    # 5. Tentar logar com a nova senha (deve ter sucesso)
    login_new = client.post(
        "/login",
        data={"username": "resetuser", "password": "NewPassword123!"},
    )
    assert login_new.status_code == 200
    assert "access_token" in login_new.json()


def test_password_reset_inexistent_email(client):
    # Deve retornar sucesso genérico mesmo se o e-mail não estiver cadastrado
    # (prevenção de enumeração)
    response = client.post(
        "/password-reset/initiate",
        json={"email": "nonexistent@visualmemory.com"},
    )
    assert response.status_code == 200
    assert "código de redefinição foi enviado" in response.json()["message"]


def test_password_reset_incorrect_code(client):
    # 1. Registrar um usuário
    client.post(
        "/users/register/initiate",
        json={
            "username": "resetuser",
            "email": "reset@visualmemory.com",
            "password": "Password123!",
        },
    )
    client.post(
        "/users/",
        json={
            "username": "resetuser",
            "email": "reset@visualmemory.com",
            "password": "Password123!",
            "code": "123456",
        },
    )

    # 2. Iniciar a redefinição de senha
    client.post(
        "/password-reset/initiate",
        json={"email": "reset@visualmemory.com"},
    )

    # 3. Confirmar com código incorreto (deve falhar)
    confirm_resp = client.post(
        "/password-reset/confirm",
        json={
            "email": "reset@visualmemory.com",
            "code": "000000",
            "new_password": "NewPassword123!",
        },
    )
    assert confirm_resp.status_code == 400
    assert "Código de redefinição incorreto" in confirm_resp.json()["detail"]


def test_password_reset_expired_code(client, db_session):
    # 1. Registrar um usuário
    client.post(
        "/users/register/initiate",
        json={
            "username": "resetuser",
            "email": "reset@visualmemory.com",
            "password": "Password123!",
        },
    )
    client.post(
        "/users/",
        json={
            "username": "resetuser",
            "email": "reset@visualmemory.com",
            "password": "Password123!",
            "code": "123456",
        },
    )

    # 2. Iniciar a redefinição de senha
    client.post(
        "/password-reset/initiate",
        json={"email": "reset@visualmemory.com"},
    )

    # Forçar a expiração do código de redefinição no banco de dados
    pwd_reset = (
        db_session.query(PasswordReset)
        .filter(PasswordReset.email == "reset@visualmemory.com")
        .first()
    )
    assert pwd_reset is not None
    pwd_reset.expires_at = datetime.now() - timedelta(minutes=1)
    db_session.commit()

    # 3. Confirmar a nova senha (deve falhar por expiração)
    confirm_resp = client.post(
        "/password-reset/confirm",
        json={
            "email": "reset@visualmemory.com",
            "code": "654321",
            "new_password": "NewPassword123!",
        },
    )
    assert confirm_resp.status_code == 400
    assert "Código de redefinição expirou" in confirm_resp.json()["detail"]


def test_password_reset_weak_new_password(client):
    # A nova senha deve atender aos critérios de força
    # (min 8 caracteres, maiúscula, minúscula, caractere especial)
    # Tentar com uma senha fraca de 4 caracteres
    response = client.post(
        "/password-reset/confirm",
        json={
            "email": "reset@visualmemory.com",
            "code": "654321",
            "new_password": "123",
        },
    )
    assert response.status_code == 422
