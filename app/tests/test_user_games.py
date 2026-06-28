import pytest

MOCK_GAME = {
    "external_id": 9999,
    "title": "Hollow Knight",
    "cover_url": "https://example.com/hollow_knight.jpg",
    "release_year": 2017,
    "platforms": ["PC", "Nintendo Switch"],
    "genres": ["Metroidvania", "Action"]
}

@pytest.fixture
def setup_game(client, auth_headers):
    """Fixture auxiliar que adiciona o jogo base no banco e retorna o ID interno."""
    response = client.post("/games/", json=MOCK_GAME, headers=auth_headers)
    return response.json()["id"]


def test_add_game_to_library(client, auth_headers, setup_game):
    """Testa adicionar um jogo à biblioteca do usuário."""
    response = client.post(
        "/user-games/", 
        json={"game_id": setup_game}, 
        headers=auth_headers
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["game_id"] == setup_game
    assert data["status"] == "Quero Jogar"


def test_add_same_game_twice(client, auth_headers, setup_game):
    """Garante que o usuário não pode adicionar o mesmo jogo duas vezes."""
    client.post("/user-games/", json={"game_id": setup_game}, headers=auth_headers)
    
    response = client.post("/user-games/", json={"game_id": setup_game}, headers=auth_headers)
    
    assert response.status_code == 400 


def test_invalid_rating(client, auth_headers, setup_game):
    """Testa se a API bloqueia notas acima de 10."""
    ug_response = client.post("/user-games/", json={"game_id": setup_game}, headers=auth_headers)
    ug_id = ug_response.json()["id"]
    
    response = client.put(
        f"/user-games/{ug_id}", 
        json={"rating": 11}, 
        headers=auth_headers
    )
    
    assert response.status_code == 422


def test_invalid_hours_played(client, auth_headers, setup_game):
    """Testa se a API bloqueia horas jogadas negativas."""
    ug_response = client.post("/user-games/", json={"game_id": setup_game}, headers=auth_headers)
    ug_id = ug_response.json()["id"]
    
    response = client.put(
        f"/user-games/{ug_id}", 
        json={"hours_played": -5}, 
        headers=auth_headers
    )
    
    assert response.status_code == 422


def test_cannot_edit_other_user_game(client, auth_headers, second_user_headers, setup_game):
    """Garante que o 'invasor' não pode editar a biblioteca do 'tester'."""
    ug_response = client.post("/user-games/", json={"game_id": setup_game}, headers=auth_headers)
    tester_ug_id = ug_response.json()["id"]
    
    malicious_response = client.put(
        f"/user-games/{tester_ug_id}", 
        json={"rating": 0, "notes": "Jogo ruim!"}, 
        headers=second_user_headers
    )
    
    assert malicious_response.status_code in [403, 404]