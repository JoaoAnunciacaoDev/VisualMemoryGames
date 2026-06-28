def test_login_user(client):
    client.post("/users/", json={
        "username": "joaogamer",
        "email": "joao@gamelog.com",
        "password": "SenhaSegura_123!"
    })

    response = client.post("/login", data={
        "username": "joaogamer",
        "password": "SenhaSegura_123!"
    })

    assert response.status_code == 200
    assert "access_token" in response.json()
    assert response.json()["token_type"] == "bearer"


def test_login_wrong_password(client):
    client.post("/users/", json={
        "username": "joaogamer",
        "email": "joao@gamelog.com",
        "password": "SenhaSegura_123!"
    })

    response = client.post("/login", data={
        "username": "joaogamer",
        "password": "SenhaIncorreta_999!"
    })

    assert response.status_code == 401
    assert response.json()["detail"] == "Usuário ou senha incorretos"


def test_create_user_weak_password(client):
    response = client.post("/users/", json={
        "username": "weak",
        "email": "weak@example.com",
        "password": "12345"
    })
    assert response.status_code == 422


def test_create_duplicate_user(client):
    client.post("/users/", json={
        "username": "dup",
        "email": "dup@example.com",
        "password": "SenhaSegura_123!"
    })
    response = client.post("/users/", json={
        "username": "dup",
        "email": "dup2@example.com",
        "password": "SenhaSegura_123!"
    })
    assert response.status_code == 400
    assert "já cadastrado" in response.json()["detail"]