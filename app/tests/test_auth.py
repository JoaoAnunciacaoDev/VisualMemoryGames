def test_login_user(client):
    client.post(
        "/users/register/initiate",
        json={
            "username": "joaogamer",
            "email": "joao@visualmemory.com",
            "password": "SenhaSegura_123!",
        },
    )
    client.post(
        "/users/",
        json={
            "username": "joaogamer",
            "email": "joao@visualmemory.com",
            "password": "SenhaSegura_123!",
            "code": "123456",
        },
    )

    response = client.post("/login", data={"username": "joaogamer", "password": "SenhaSegura_123!"})

    assert response.status_code == 200
    assert response.json()["success"] is True
    assert "token" in response.cookies

    # A aplicação expõe somente o fluxo por cookie HttpOnly.
    response_token = client.post(
        "/token", data={"username": "joaogamer", "password": "SenhaSegura_123!"}
    )
    assert response_token.status_code == 404


def test_login_wrong_password(client):
    client.post(
        "/users/register/initiate",
        json={
            "username": "joaogamer",
            "email": "joao@visualmemory.com",
            "password": "SenhaSegura_123!",
        },
    )
    client.post(
        "/users/",
        json={
            "username": "joaogamer",
            "email": "joao@visualmemory.com",
            "password": "SenhaSegura_123!",
            "code": "123456",
        },
    )

    response = client.post(
        "/login", data={"username": "joaogamer", "password": "SenhaIncorreta_999!"}
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Usuário ou senha incorretos"


def test_create_user_weak_password(client):
    response = client.post(
        "/users/register/initiate",
        json={"username": "weak", "email": "weak@example.com", "password": "12345"},
    )
    assert response.status_code == 422


def test_create_duplicate_user(client):
    client.post(
        "/users/register/initiate",
        json={"username": "dup", "email": "dup@example.com", "password": "SenhaSegura_123!"},
    )
    client.post(
        "/users/",
        json={
            "username": "dup",
            "email": "dup@example.com",
            "password": "SenhaSegura_123!",
            "code": "123456",
        },
    )

    response = client.post(
        "/users/register/initiate",
        json={"username": "dup", "email": "dup2@example.com", "password": "SenhaSegura_123!"},
    )
    assert response.status_code == 400
    assert "já cadastrado" in response.json()["detail"]


def test_login_remember_me(client):
    client.post(
        "/users/register/initiate",
        json={
            "username": "remember",
            "email": "remember@visualmemory.com",
            "password": "SenhaSegura_123!",
        },
    )
    client.post(
        "/users/",
        json={
            "username": "remember",
            "email": "remember@visualmemory.com",
            "password": "SenhaSegura_123!",
            "code": "123456",
        },
    )

    # 1. Test remember_me = True (deve manter a sessão por 7 dias)
    response_true = client.post(
        "/login",
        data={"username": "remember", "password": "SenhaSegura_123!", "remember_me": "true"},
    )
    assert response_true.status_code == 200
    set_cookie_true = response_true.headers.get("set-cookie", "")
    assert "Max-Age=604800" in set_cookie_true or "max-age=604800" in set_cookie_true

    # 2. Test remember_me = False (should set transient session cookie, no Max-Age)
    response_false = client.post(
        "/login",
        data={"username": "remember", "password": "SenhaSegura_123!", "remember_me": "false"},
    )
    assert response_false.status_code == 200
    set_cookie_false = response_false.headers.get("set-cookie", "")
    assert "Max-Age" not in set_cookie_false and "max-age" not in set_cookie_false
