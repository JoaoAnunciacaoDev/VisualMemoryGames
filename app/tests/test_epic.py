from unittest.mock import patch

import pytest

from app.models.activity import Activity
from app.models.custom_lists import CustomList, custom_list_games
from app.models.game import Game
from app.models.user_game import UserGame
from app.routers.epic import enrich_games_metadata_in_background


def test_import_epic_games_unauthenticated(client):
    response = client.post("/users/me/epic/import", json={"titles": ["Control", "Death Stranding"]})
    assert response.status_code == 401


def test_import_epic_games_empty_list(client, auth_headers):
    response = client.post("/users/me/epic/import", json={"titles": []}, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["imported_count"] == 0
    assert data["skipped_count"] == 0
    assert data["total_received"] == 0


def test_import_epic_games_success(client, auth_headers, db_session):
    titles = [
        "Control",
        "Death Stranding",
        "GTA V",
        "   ",  # whitespace only, should be ignored
        "Control",  # duplicate in payload
    ]
    response = client.post("/users/me/epic/import", json={"titles": titles}, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["imported_count"] == 3
    assert data["skipped_count"] == 2  # 1 whitespace/empty handled, 1 duplicate in payload
    assert data["total_received"] == 5

    # Verifica se os jogos foram criados no banco com store='EPIC' e status='Quero Jogar'
    user_games = db_session.query(UserGame).filter(UserGame.store == "EPIC").all()
    assert len(user_games) == 3
    titles_in_db = {ug.game.title for ug in user_games}
    assert titles_in_db == {"Control", "Death Stranding", "GTA V"}

    for ug in user_games:
        assert ug.status == "Quero Jogar"
        assert ug.hours_played == 0.0

    # Verifica atividades registradas
    activities = db_session.query(Activity).filter(Activity.action_type == "ADDED").all()
    assert len(activities) >= 3


def test_import_epic_games_existing_in_catalog(client, auth_headers, db_session):
    # Cria previamente no catálogo global com capa
    existing_game = Game(
        title="Celeste",
        cover_url="https://images.igdb.com/celeste.jpg",
        platforms=["PC"],
        genres=["Platformer"],
    )
    db_session.add(existing_game)
    db_session.commit()

    response = client.post(
        "/users/me/epic/import",
        json={"titles": ["celeste"]},  # test case insensitivity
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["imported_count"] == 1
    assert data["skipped_count"] == 0

    ug = db_session.query(UserGame).filter(UserGame.game_id == existing_game.id).first()
    assert ug is not None
    assert ug.game.title == "Celeste"
    assert ug.game.cover_url == "https://images.igdb.com/celeste.jpg"
    assert ug.store == "EPIC"


def test_import_epic_games_already_in_user_library(client, auth_headers, db_session):
    # Importa primeira vez
    res1 = client.post(
        "/users/me/epic/import",
        json={"titles": ["Alan Wake 2"]},
        headers=auth_headers,
    )
    assert res1.status_code == 200
    assert res1.json()["imported_count"] == 1

    # Reimporta o mesmo jogo
    res2 = client.post(
        "/users/me/epic/import",
        json={"titles": ["Alan Wake 2"]},
        headers=auth_headers,
    )
    assert res2.status_code == 200
    data = res2.json()
    assert data["imported_count"] == 0
    assert data["skipped_count"] == 1

    # Garante que não duplicou UserGame
    count = db_session.query(UserGame).join(Game).filter(Game.title == "Alan Wake 2").count()
    assert count == 1


def test_remove_epic_games(client, auth_headers, db_session):
    # 1. Importa jogos da Epic
    client.post(
        "/users/me/epic/import",
        json={"titles": ["Hades", "Hollow Knight"]},
        headers=auth_headers,
    )
    user_games = db_session.query(UserGame).filter(UserGame.store == "EPIC").all()
    assert len(user_games) == 2

    # Cria uma lista customizada e vincula um dos jogos
    cl = CustomList(name="Favoritos Epic", user_id=user_games[0].user_id)
    db_session.add(cl)
    db_session.commit()
    db_session.execute(
        custom_list_games.insert().values(
            custom_list_id=cl.id,
            game_id=user_games[0].game_id,
        )
    )
    db_session.commit()

    # 2. Deleta todos os jogos da Epic
    del_resp = client.delete("/users/me/epic/games", headers=auth_headers)
    assert del_resp.status_code == 200
    del_data = del_resp.json()
    assert del_data["removed_count"] == 2

    # Verifica que não existem mais jogos EPIC para este usuário
    remaining = db_session.query(UserGame).filter(UserGame.store == "EPIC").all()
    assert len(remaining) == 0


def test_enrich_epic_games_endpoint(client, auth_headers, db_session):
    from app.models.user import User

    user = db_session.query(User).filter(User.username == "tester").first()
    game = Game(title="Stardew Valley", cover_url=None, genres=[], platforms=["PC"])
    db_session.add(game)
    db_session.commit()

    ug = UserGame(user_id=user.id, game_id=game.id, store="EPIC", status="Quero Jogar")
    db_session.add(ug)
    db_session.commit()

    # Chama o endpoint de enriquecimento
    resp = client.post("/users/me/epic/enrich", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["games_to_enrich_count"] >= 1


@pytest.mark.anyio
async def test_enrich_games_metadata_in_background(client, db_session):
    # Cria um jogo sem capa e sem gêneros
    game = Game(
        title="Inside",
        cover_url=None,
        platforms=["PC"],
        genres=[],
        release_year=None,
        is_manual=False,
    )
    db_session.add(game)
    db_session.commit()

    mock_igdb_result = [
        {
            "external_id": 998877,
            "title": "Inside",
            "cover_url": "https://images.igdb.com/inside.jpg",
            "release_year": 2016,
            "genres": ["Puzzle", "Platform"],
            "platforms": ["PC"],
        }
    ]

    with patch("app.routers.epic.search_games_on_igdb", return_value=mock_igdb_result):
        await enrich_games_metadata_in_background([game.id])

    db_session.expire_all()
    updated = db_session.query(Game).filter(Game.id == game.id).first()
    assert updated.cover_url == "https://images.igdb.com/inside.jpg"
    assert updated.release_year == 2016
    assert "Puzzle" in updated.genres
