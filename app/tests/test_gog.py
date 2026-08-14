from unittest.mock import patch

from app.models.game import Game
from app.models.gog_account import GogAccount
from app.models.user_game import UserGame
from app.services.gog import GogService


def test_gog_extract_username():
    service = GogService()
    assert service.extract_username("https://www.gog.com/u/gog_gamer") == "gog_gamer"
    assert service.extract_username("https://www.gog.com/u/gog_gamer/games") == "gog_gamer"
    assert service.extract_username("gog.com/u/gog_gamer/") == "gog_gamer"
    assert service.extract_username("gog_gamer") == "gog_gamer"


def test_get_connected_gog_accounts_empty(client, auth_headers):
    response = client.get("/users/me/gog/accounts", headers=auth_headers)
    assert response.status_code == 200
    assert response.json() == []


@patch("app.routers.gog.gog_service.get_public_profile")
@patch("app.routers.gog.gog_service.get_public_games")
def test_connect_gog_account_success(mock_games, mock_profile, client, auth_headers):
    mock_profile.return_value = {
        "username": "goguser1",
        "persona_name": "GOG User One",
        "avatar_url": "https://images.gog.com/avatar.jpg",
    }
    mock_games.return_value = [
        {
            "gog_id": "12345",
            "title": "The Witcher 3: Wild Hunt",
            "cover_url": "https://images.gog.com/tw3.jpg",
            "hours_played": 120.5,
            "is_platinized": True,
            "platinum_date": None,
        }
    ]

    response = client.post(
        "/users/me/gog/accounts",
        json={"profile_url": "https://www.gog.com/u/goguser1"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "goguser1"
    assert data["persona_name"] == "GOG User One"
    assert data["avatar_url"] == "https://images.gog.com/avatar.jpg"


@patch("app.routers.gog.gog_service.get_public_profile")
@patch("app.routers.gog.gog_service.get_public_games")
def test_connect_duplicate_gog_account(mock_games, mock_profile, client, auth_headers):
    mock_profile.return_value = {
        "username": "goguser1",
        "persona_name": "GOG User One",
        "avatar_url": "https://images.gog.com/avatar.jpg",
    }
    mock_games.return_value = []

    # Primeira conexão
    res1 = client.post(
        "/users/me/gog/accounts",
        json={"profile_url": "goguser1"},
        headers=auth_headers,
    )
    assert res1.status_code == 200

    # Segunda tentativa com mesmo username
    res2 = client.post(
        "/users/me/gog/accounts",
        json={"profile_url": "https://www.gog.com/u/goguser1"},
        headers=auth_headers,
    )
    assert res2.status_code == 400
    assert "já está conectada" in res2.json()["detail"]


@patch("app.routers.gog.gog_service.get_public_games")
def test_sync_gog_accounts(mock_games, client, auth_headers, db_session):
    from app.models.user import User

    user = db_session.query(User).filter_by(username="tester").first()
    account = GogAccount(
        user_id=user.id,
        username="goguser_sync",
        persona_name="Sync User",
    )
    db_session.add(account)
    db_session.commit()

    mock_games.return_value = [
        {
            "gog_id": "999",
            "title": "Cyberpunk 2077",
            "cover_url": "https://images.gog.com/cp2077.jpg",
            "hours_played": 85.0,
            "is_platinized": False,
            "platinum_date": None,
        }
    ]

    response = client.post("/users/me/gog/sync", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["new_games_count"] == 1

    # Confirma que o jogo foi gravado no banco de dados com store GOG
    user_game = (
        db_session.query(UserGame)
        .join(Game)
        .filter(UserGame.user_id == user.id, Game.title == "Cyberpunk 2077")
        .first()
    )
    assert user_game is not None
    assert user_game.store == "GOG"
    assert user_game.hours_played == 85.0


def test_disconnect_gog_account_not_found(client, auth_headers):
    response = client.delete(
        "/users/me/gog/accounts/non-existent-id",
        headers=auth_headers,
    )
    assert response.status_code == 404


def test_disconnect_gog_account_with_and_without_delete_games(client, auth_headers, db_session):
    from app.models.user import User

    user = db_session.query(User).filter_by(username="tester").first()
    account = GogAccount(
        user_id=user.id,
        username="goguser_del",
        persona_name="Delete User",
    )
    db_session.add(account)

    game = Game(title="GOG Exclusive Game", platforms=["PC"])
    db_session.add(game)
    db_session.flush()

    ug = UserGame(
        user_id=user.id,
        game_id=game.id,
        store="GOG",
        status="Jogando",
    )
    db_session.add(ug)
    db_session.commit()
    ug_id = ug.id
    account_id = account.id

    # Desconecta mantendo os jogos
    response = client.delete(
        f"/users/me/gog/accounts/{account_id}?delete_games=false",
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert db_session.query(GogAccount).filter(GogAccount.id == account_id).first() is None
    assert db_session.query(UserGame).filter(UserGame.id == ug_id).first() is not None

    # Recria conta para testar exclusão com delete_games=true
    account2 = GogAccount(
        user_id=user.id,
        username="goguser_del2",
    )
    db_session.add(account2)
    db_session.commit()
    account2_id = account2.id

    response2 = client.delete(
        f"/users/me/gog/accounts/{account2_id}?delete_games=true",
        headers=auth_headers,
    )
    assert response2.status_code == 200
    assert db_session.query(UserGame).filter(UserGame.id == ug_id).first() is None
