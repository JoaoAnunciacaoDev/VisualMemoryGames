from app.models.activity import Activity
from app.models.game import Game
from app.models.user_game import UserGame


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
