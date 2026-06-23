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