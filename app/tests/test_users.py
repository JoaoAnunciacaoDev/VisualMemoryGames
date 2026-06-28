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
    client.post("/users/", json={
        "username": "vitima",
        "email": "vitima@example.com",
        "password": "SenhaSegura_123!"
    })
    
    me = client.get("/users/me", headers=auth_headers)
    tester_id = me.json()["id"]
    response = client.delete(f"/users/{tester_id}", headers=second_user_headers)
    assert response.status_code == 403