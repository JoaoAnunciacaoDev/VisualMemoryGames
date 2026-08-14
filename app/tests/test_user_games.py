import pytest

MOCK_GAME = {
    "external_id": 9999,
    "title": "Hollow Knight",
    "cover_url": "https://example.com/hollow_knight.jpg",
    "release_year": 2017,
    "platforms": ["PC", "Nintendo Switch"],
    "genres": ["Metroidvania", "Action"],
}


@pytest.fixture
def setup_game(client, auth_headers):
    """Fixture auxiliar que adiciona o jogo base no banco e retorna o ID interno."""
    response = client.post("/games/", json=MOCK_GAME, headers=auth_headers)
    return response.json()["id"]


def test_add_game_to_library(client, auth_headers, setup_game):
    """Testa adicionar um jogo à biblioteca do usuário."""
    response = client.post("/user-games/", json={"game_id": setup_game}, headers=auth_headers)

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

    response = client.put(f"/user-games/{ug_id}", json={"rating": 11}, headers=auth_headers)

    assert response.status_code == 422


def test_invalid_hours_played(client, auth_headers, setup_game):
    """Testa se a API bloqueia horas jogadas negativas."""
    ug_response = client.post("/user-games/", json={"game_id": setup_game}, headers=auth_headers)
    ug_id = ug_response.json()["id"]

    response = client.put(f"/user-games/{ug_id}", json={"hours_played": -5}, headers=auth_headers)

    assert response.status_code == 422


def test_cannot_edit_other_user_game(client, auth_headers, second_user_headers, setup_game):
    """Garante que o 'invasor' não pode editar a biblioteca do 'tester'."""
    ug_response = client.post("/user-games/", json={"game_id": setup_game}, headers=auth_headers)
    tester_ug_id = ug_response.json()["id"]

    malicious_response = client.put(
        f"/user-games/{tester_ug_id}",
        json={"rating": 0, "notes": "Jogo ruim!"},
        headers=second_user_headers,
    )

    assert malicious_response.status_code in [403, 404]


def test_invalid_date_relationships(client, auth_headers, setup_game):
    """Testa se a API bloqueia relacionamentos de data
    inválidos (ex: finalizado antes de iniciado)."""
    ug_response = client.post("/user-games/", json={"game_id": setup_game}, headers=auth_headers)
    ug_id = ug_response.json()["id"]

    response = client.put(
        f"/user-games/{ug_id}",
        json={
            "status": "Zerado",
            "started_at": "2023-05-10",
            "finished_at": "2023-05-01",
        },
        headers=auth_headers,
    )

    assert response.status_code == 400
    assert (
        "A data de início não pode ser posterior à data de conclusão" in response.json()["detail"]
    )


def test_user_game_reviews_flow(client, auth_headers, setup_game):
    """Testa o fluxo completo de CRUD de múltiplas avaliações e sincronização."""
    # 1. Adicionar o jogo à biblioteca
    ug_response = client.post("/user-games/", json={"game_id": setup_game}, headers=auth_headers)
    ug_id = ug_response.json()["id"]

    # Iniciar e mudar status para permitir reviews
    client.put(f"/user-games/{ug_id}", json={"status": "Jogando"}, headers=auth_headers)

    def get_ug():
        lib = client.get("/user-games/me", headers=auth_headers).json()
        return [ug for ug in lib if ug["id"] == ug_id][0]

    # 2. Criar a primeira avaliação (Review 1)
    rev1_response = client.post(
        f"/user-games/{ug_id}/reviews",
        json={"rating": 8.5, "notes": "Review 1 text"},
        headers=auth_headers,
    )
    assert rev1_response.status_code == 201
    rev1 = rev1_response.json()
    assert rev1["rating"] == 8.5
    assert rev1["notes"] == "Review 1 text"

    # Verificar que o UserGame foi sincronizado com Review 1
    ug = get_ug()
    assert ug["rating"] == 8.5
    assert ug["notes"] == "Review 1 text"

    # Verificar que gerou atividade RATED
    act_resp = client.get("/social/activities/me", headers=auth_headers)
    activities = act_resp.json()["items"]
    rated_act = next((a for a in activities if a["action_type"] == "RATED"), None)
    assert rated_act is not None
    assert rated_act["context"] == "8.5"
    assert rated_act["commentary"] == "Review 1 text"

    # 3. Criar a segunda avaliação (Review 2 - mais recente)
    rev2_response = client.post(
        f"/user-games/{ug_id}/reviews",
        json={"rating": 9.0, "notes": "Review 2 text"},
        headers=auth_headers,
    )
    assert rev2_response.status_code == 201
    rev2 = rev2_response.json()

    # Verificar sincronização com o mais recente (Review 2)
    ug = get_ug()
    assert ug["rating"] == 9.0
    assert ug["notes"] == "Review 2 text"

    # Verificar que gerou uma nova atividade RATED para 9.0 e manteve a de 8.5
    act_resp_rev2 = client.get("/social/activities/me", headers=auth_headers)
    rated_acts = [a for a in act_resp_rev2.json()["items"] if a["action_type"] == "RATED"]
    assert len(rated_acts) == 2
    assert rated_acts[0]["context"] == "9.0"
    assert rated_acts[0]["commentary"] == "Review 2 text"
    assert rated_acts[1]["context"] == "8.5"

    # 4. Listar avaliações
    get_revs = client.get(f"/user-games/{ug_id}/reviews", headers=auth_headers)
    assert len(get_revs.json()) == 2
    # Devem vir ordenados por data decrescente (Review 2 primeiro)
    assert get_revs.json()[0]["id"] == rev2["id"]

    # 5. Atualizar Review 2
    update_response = client.put(
        f"/user-games/{ug_id}/reviews/{rev2['id']}",
        json={"rating": 9.5, "notes": "Review 2 updated"},
        headers=auth_headers,
    )
    assert update_response.status_code == 200
    assert update_response.json()["rating"] == 9.5

    # Verificar sincronização pós-update
    ug = get_ug()
    assert ug["rating"] == 9.5
    assert ug["notes"] == "Review 2 updated"

    # Verificar que gerou uma atividade RATED para 9.5, mantendo as de 9.0 e 8.5
    act_resp_update = client.get("/social/activities/me", headers=auth_headers)
    rated_acts = [a for a in act_resp_update.json()["items"] if a["action_type"] == "RATED"]
    assert len(rated_acts) == 3
    assert rated_acts[0]["context"] == "9.5"
    assert rated_acts[0]["commentary"] == "Review 2 updated"
    assert rated_acts[1]["context"] == "9.0"
    assert rated_acts[2]["context"] == "8.5"

    # 6. Deletar Review 2
    del_response = client.delete(f"/user-games/{ug_id}/reviews/{rev2['id']}", headers=auth_headers)
    assert del_response.status_code == 204

    # Verificar que o UserGame sincronizou de volta para Review 1
    ug = get_ug()
    assert ug["rating"] == 8.5
    assert ug["notes"] == "Review 1 text"

    # A atividade RATED de 9.5 deve ter sido deletada, mantendo 9.0 e atualizando 8.5 para o topo
    act_resp_del1 = client.get("/social/activities/me", headers=auth_headers)
    rated_acts = [a for a in act_resp_del1.json()["items"] if a["action_type"] == "RATED"]
    assert len(rated_acts) == 2
    assert rated_acts[0]["context"] == "8.5"
    assert rated_acts[0]["commentary"] == "Review 1 text"
    assert rated_acts[1]["context"] == "9.0"

    # 7. Deletar Review 1
    del_response2 = client.delete(f"/user-games/{ug_id}/reviews/{rev1['id']}", headers=auth_headers)
    assert del_response2.status_code == 204

    # Verificar que o UserGame voltou a ficar sem nota/review
    ug = get_ug()
    assert ug["rating"] is None
    assert ug["notes"] is None

    # Como o jogo não tem mais nenhuma nota, todas as atividades RATED dele devem ser deletadas
    act_resp_del2 = client.get("/social/activities/me", headers=auth_headers)
    rated_acts = [a for a in act_resp_del2.json()["items"] if a["action_type"] == "RATED"]
    assert len(rated_acts) == 0


def test_create_game_with_conflicting_external_id(client, auth_headers):
    """Garante que dois jogos de fontes distintas com o mesmo external_id
    não retornem o jogo errado.
    """
    # Jogo 1 criado com external_id 480
    res1 = client.post(
        "/games/",
        json={
            "external_id": 480,
            "title": "Resident Evil 7: Biohazard",
            "release_year": 2017,
            "platforms": ["PC"],
            "genres": ["Horror"],
        },
        headers=auth_headers,
    )
    assert res1.status_code == 201
    assert res1.json()["title"] == "Resident Evil 7: Biohazard"
    id1 = res1.json()["id"]

    # Jogo 2 criado de outra fonte com o mesmo external_id 480 mas título diferente
    res2 = client.post(
        "/games/",
        json={
            "external_id": 480,
            "title": "Silent Hill",
            "release_year": 1999,
            "platforms": ["PlayStation"],
            "genres": ["Horror"],
        },
        headers=auth_headers,
    )
    assert res2.status_code == 201
    assert res2.json()["title"] == "Silent Hill"
    id2 = res2.json()["id"]

    # Garante que são jogos distintos e que Silent Hill não virou Resident Evil 7
    assert id1 != id2
