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