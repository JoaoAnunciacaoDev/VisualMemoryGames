def test_create_user(client):
    response = client.post("/users/", json={
        "username": "joaogamer",
        "email": "joao@gamelog.com",
        "password": "SenhaSegura_123!"
    })

    assert response.status_code == 201
    data = response.json()
    assert data["username"] == "joaogamer"
    assert "password" not in data


def test_create_user_duplicate_email(client):
    payload = {
        "username": "joaogamer",
        "email": "joao@gamelog.com",
        "password": "SenhaSegura_123!"
    }
    client.post("/users/", json=payload)

    response = client.post("/users/", json={
        "username": "maria",
        "email": "joao@gamelog.com",
        "password": "SenhaSegura_123!"
    })

    assert response.status_code == 400


def test_create_user_weak_password(client):
    response = client.post("/users/", json={
        "username": "joaogamer",
        "email": "joao@gamelog.com",
        "password": "123"
    })

    assert response.status_code == 422