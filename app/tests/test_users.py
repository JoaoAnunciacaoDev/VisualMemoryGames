from datetime import datetime, timedelta

from app.models.email_verification import EmailVerification


def test_create_user(client):
    # 1. Iniciar registro
    init_resp = client.post(
        "/users/register/initiate",
        json={"username": "joaogamer", "email": "joao@gamelog.com", "password": "SenhaSegura_123!"},
    )
    assert init_resp.status_code == 200

    # 2. Confirmar registro
    response = client.post(
        "/users/",
        json={
            "username": "joaogamer",
            "email": "joao@gamelog.com",
            "password": "SenhaSegura_123!",
            "code": "123456",
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["username"] == "joaogamer"
    assert "password" not in data


def test_create_user_duplicate_email(client):
    # Cadastrar primeiro usuário
    client.post(
        "/users/register/initiate",
        json={"username": "joaogamer", "email": "joao@gamelog.com", "password": "SenhaSegura_123!"},
    )
    client.post(
        "/users/",
        json={
            "username": "joaogamer",
            "email": "joao@gamelog.com",
            "password": "SenhaSegura_123!",
            "code": "123456",
        },
    )

    # Tentar iniciar cadastro de segundo usuário com e-mail duplicado
    response = client.post(
        "/users/register/initiate",
        json={"username": "maria", "email": "joao@gamelog.com", "password": "SenhaSegura_123!"},
    )
    assert response.status_code == 400


def test_create_user_weak_password(client):
    response = client.post(
        "/users/register/initiate",
        json={"username": "joaogamer", "email": "joao@gamelog.com", "password": "123"},
    )
    assert response.status_code == 422


def test_get_me_without_token(client):
    response = client.get("/users/me")
    assert response.status_code == 401


def test_get_me_with_token(client, auth_headers):
    response = client.get("/users/me", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["username"] == "tester"


def test_delete_user_without_token(client):
    response = client.delete("/users/algum-id-qualquer")
    assert response.status_code == 401


def test_delete_another_user(client, auth_headers, second_user_headers):
    client.post(
        "/users/register/initiate",
        json={"username": "vitima", "email": "vitima@example.com", "password": "SenhaSegura_123!"},
    )
    client.post(
        "/users/",
        json={
            "username": "vitima",
            "email": "vitima@example.com",
            "password": "SenhaSegura_123!",
            "code": "123456",
        },
    )

    me = client.get("/users/me", headers=auth_headers)
    tester_id = me.json()["id"]
    response = client.delete(f"/users/{tester_id}", headers=second_user_headers)
    assert response.status_code == 403


def test_create_user_invalid_code(client):
    # 1. Iniciar registro
    client.post(
        "/users/register/initiate",
        json={"username": "joaogamer", "email": "joao@gamelog.com", "password": "SenhaSegura_123!"},
    )

    # 2. Confirmar com código incorreto
    response = client.post(
        "/users/",
        json={
            "username": "joaogamer",
            "email": "joao@gamelog.com",
            "password": "SenhaSegura_123!",
            "code": "000000",
        },
    )
    assert response.status_code == 400
    assert "Código de verificação incorreto" in response.json()["detail"]


def test_create_user_expired_code(client, db_session):
    # 1. Iniciar registro
    client.post(
        "/users/register/initiate",
        json={"username": "joaogamer", "email": "joao@gamelog.com", "password": "SenhaSegura_123!"},
    )

    # Forçar expiração do código editando diretamente no banco
    verification = (
        db_session.query(EmailVerification).filter(EmailVerification.email == "joao@gamelog.com").first()
    )
    assert verification is not None
    verification.expires_at = datetime.now() - timedelta(minutes=1)
    db_session.commit()

    # 2. Confirmar registro (deve falhar devido à expiração)
    response = client.post(
        "/users/",
        json={
            "username": "joaogamer",
            "email": "joao@gamelog.com",
            "password": "SenhaSegura_123!",
            "code": "123456",
        },
    )
    assert response.status_code == 400
    assert "Código de verificação expirou" in response.json()["detail"]
