def test_create_tierlist_without_token(client):
    response = client.post(
        "/tierlists/",
        json={"title": "Melhores JRPGs"}
    )
    
    assert response.status_code == 401


def test_create_tierlist(client, auth_headers):
    response = client.post(
        "/tierlists/",
        json={"title": "Melhores JRPGs"},
        headers=auth_headers
    )

    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Melhores JRPGs"
    assert len(data["categories"]) > 0


def test_get_my_tierlists(auth_headers, client):
    """Obtém as tier lists do utilizador autenticado."""
    client.post("/tierlists/", json={"title": "TL1"}, headers=auth_headers)
    client.post("/tierlists/", json={"title": "TL2"}, headers=auth_headers)

    me = client.get("/users/me", headers=auth_headers)
    user_id = me.json()["id"]
    
    response = client.get(f"/tierlists/user/{user_id}", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 2
    titles = [tl["title"] for tl in data]
    assert "TL1" in titles
    assert "TL2" in titles


def test_cannot_see_other_user_tierlists(auth_headers, second_user_headers, client):
    """Um utilizador não pode ver as tierlists de outro."""
    client.post("/tierlists/", json={"title": "Minha TierList"}, headers=auth_headers)

    me = client.get("/users/me", headers=auth_headers)
    tester_id = me.json()["id"]

    response = client.get(f"/tierlists/user/{tester_id}", headers=second_user_headers)
    assert response.status_code == 403


def test_update_tierlist(auth_headers, client):
    """Atualiza o título de uma tierlist."""
    create_resp = client.post("/tierlists/", json={"title": "Titulo Antigo"}, headers=auth_headers)
    tierlist_id = create_resp.json()["id"]

    update_resp = client.put(f"/tierlists/{tierlist_id}", json={"title": "Titulo Novo"}, headers=auth_headers)
    assert update_resp.status_code == 200
    assert update_resp.json()["title"] == "Titulo Novo"


def test_delete_tierlist(auth_headers, client):
    """Remove uma tierlist."""
    create_resp = client.post("/tierlists/", json={"title": "Para Apagar"}, headers=auth_headers)
    tierlist_id = create_resp.json()["id"]

    delete_resp = client.delete(f"/tierlists/{tierlist_id}", headers=auth_headers)
    assert delete_resp.status_code == 204

    get_resp = client.get(f"/tierlists/{tierlist_id}", headers=auth_headers)
    assert get_resp.status_code == 404


def test_cannot_delete_other_user_tierlist(auth_headers, second_user_headers, client):
    """Um utilizador não pode apagar a tierlist de outro."""
    create_resp = client.post("/tierlists/", json={"title": "Intocavel"}, headers=auth_headers)
    tierlist_id = create_resp.json()["id"]

    delete_resp = client.delete(f"/tierlists/{tierlist_id}", headers=second_user_headers)
    assert delete_resp.status_code == 403