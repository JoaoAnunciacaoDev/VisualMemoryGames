from unittest.mock import patch

from app.models.game import Game
from app.models.user_game import UserGame


@patch("app.routers.steam.steam_service.resolve_vanity_url")
@patch("app.routers.steam.steam_service.get_player_summary")
def test_connect_steam_account_success(mock_summary, mock_vanity, client, auth_headers):
    mock_vanity.return_value = "765611980843858"
    mock_summary.return_value = {
        "steam_id": "765611980843858",
        "persona_name": "Gamer123",
        "avatar_url": "http://avatar.url",
    }

    # Mock de sincronização inicial
    with patch("app.routers.steam.sync_single_account", return_value=(2, 0)) as mock_sync:
        response = client.post(
            "/users/me/steam/accounts",
            json={"profile_url": "https://steamcommunity.com/id/gamer123"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["steam_id"] == "765611980843858"
        assert data["persona_name"] == "Gamer123"
        assert mock_sync.call_count == 1


@patch("app.routers.steam.steam_service.get_player_summary")
def test_connect_steam_account_numeric_id(mock_summary, client, auth_headers):
    mock_summary.return_value = {
        "steam_id": "765611980843858",
        "persona_name": "Gamer123",
        "avatar_url": "http://avatar.url",
    }

    with patch("app.routers.steam.sync_single_account", return_value=(1, 0)):
        response = client.post(
            "/users/me/steam/accounts",
            json={"profile_url": "765611980843858"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["steam_id"] == "765611980843858"


def test_get_connected_accounts_empty(client, auth_headers):
    response = client.get("/users/me/steam/accounts", headers=auth_headers)
    assert response.status_code == 200
    assert response.json() == []


@patch("app.routers.steam.steam_service.get_player_summary")
def test_connect_duplicate_steam_account(mock_summary, client, auth_headers, db_session):
    mock_summary.return_value = {
        "steam_id": "765611980843858",
        "persona_name": "Gamer123",
        "avatar_url": "http://avatar.url",
    }

    with patch("app.routers.steam.sync_single_account", return_value=(0, 0)):
        # Primeira conexão
        response = client.post(
            "/users/me/steam/accounts",
            json={"profile_url": "765611980843858"},
            headers=auth_headers,
        )
        assert response.status_code == 200

        # Segunda conexão (duplicada)
        response = client.post(
            "/users/me/steam/accounts",
            json={"profile_url": "765611980843858"},
            headers=auth_headers,
        )
        assert response.status_code == 400
        assert "já está conectada" in response.json()["detail"]


@patch("app.routers.steam.steam_service.get_player_summary")
def test_disconnect_steam_account_success(mock_summary, client, auth_headers, db_session):
    mock_summary.return_value = {
        "steam_id": "765611980843858",
        "persona_name": "Gamer123",
        "avatar_url": "http://avatar.url",
    }

    with patch("app.routers.steam.sync_single_account", return_value=(0, 0)):
        response = client.post(
            "/users/me/steam/accounts",
            json={"profile_url": "765611980843858"},
            headers=auth_headers,
        )
        account_id = response.json()["id"]

        # Cria jogo de teste no banco
        game = Game(title="Steam Game A", steam_appid=111, platforms="[]", genres="[]")
        db_session.add(game)
        db_session.commit()
        db_session.refresh(game)

        # Adiciona à biblioteca do tester
        from app.models.custom_lists import CustomList, custom_list_games
        from app.models.user import User

        tester = db_session.query(User).filter(User.username == "tester").first()
        user_game = UserGame(user_id=tester.id, game_id=game.id, status="Jogando", store="STEAM")
        db_session.add(user_game)

        # Cria uma lista customizada e adiciona o jogo nela
        c_list = CustomList(user_id=tester.id, name="Concluídos 2026")
        c_list.games.append(game)
        db_session.add(c_list)
        db_session.commit()
        db_session.refresh(c_list)

        # Verifica se a associação existe
        assoc_count_before = (
            db_session.query(custom_list_games)
            .filter(
                custom_list_games.c.game_id == game.id,
                custom_list_games.c.custom_list_id == c_list.id,
            )
            .count()
        )
        assert assoc_count_before == 1

        # Desconectar COM deleção de jogos
        with patch(
            "app.routers.steam.steam_service.get_owned_games", return_value=[{"appid": 111}]
        ):
            del_resp = client.delete(
                f"/users/me/steam/accounts/{account_id}?delete_games=true", headers=auth_headers
            )
            assert del_resp.status_code == 200
            assert del_resp.json()["message"] == "Conta Steam desconectada com sucesso."

        # Verifica se o jogo foi removido da biblioteca
        ug_count = db_session.query(UserGame).filter(UserGame.user_id == tester.id).count()
        assert ug_count == 0

        # Verifica se a associação na lista customizada também foi deletada
        assoc_count_after = (
            db_session.query(custom_list_games)
            .filter(
                custom_list_games.c.game_id == game.id,
                custom_list_games.c.custom_list_id == c_list.id,
            )
            .count()
        )
        assert assoc_count_after == 0

        # Verificar que a lista está vazia de novo
        list_resp = client.get("/users/me/steam/accounts", headers=auth_headers)
        assert list_resp.json() == []


@patch("app.routers.steam.steam_service.is_game_platinized")
@patch("app.routers.steam.steam_service.get_recently_played_games")
@patch("app.routers.steam.steam_service.get_owned_games")
@patch("app.routers.steam.steam_service.get_player_summary")
def test_sync_steam_games_success(
    mock_summary, mock_games, mock_recent, mock_plat, client, auth_headers, db_session
):
    mock_summary.return_value = {
        "steam_id": "765611980843858",
        "persona_name": "Gamer123",
        "avatar_url": "http://avatar.url",
    }

    mock_recent.return_value = [{"appid": 400}]

    from datetime import date

    async def side_effect_plat(steam_id, appid, *args, **kwargs):
        return date(2026, 7, 2) if appid == 500 else None

    mock_plat.side_effect = side_effect_plat

    # Mock de jogos retornados pela API da Steam
    mock_games.return_value = [
        {
            "appid": 400,
            "name": "Portal",
            "playtime_forever": 600,
        },  # 10 horas -> status Jogando (recentemente jogado)
        {
            "appid": 500,
            "name": "Left 4 Dead",
            "playtime_forever": 1200,
        },  # 20 horas -> status Platinado (tem platina)
        {
            "appid": 600,
            "name": "Half-Life 2",
            "playtime_forever": 0,
        },  # 0 horas -> status Quero Jogar
    ]

    # Inicia com mock de sync zerado durante o connect
    with patch("app.routers.steam.sync_single_account", return_value=(0, 0)):
        client.post(
            "/users/me/steam/accounts",
            json={"profile_url": "765611980843858"},
            headers=auth_headers,
        )

    # Executa a rota de sincronização
    sync_resp = client.post("/users/me/steam/sync", headers=auth_headers)
    assert sync_resp.status_code == 200
    sync_data = sync_resp.json()
    assert sync_data["new_games_count"] == 3
    assert sync_data["updated_games_count"] == 0

    # Verifica se os jogos foram criados no banco
    games = db_session.query(Game).all()
    assert len(games) == 3

    # Verifica o UserGame criado
    user_games = db_session.query(UserGame).all()
    assert len(user_games) == 3

    portal_ug = db_session.query(UserGame).join(Game).filter(Game.steam_appid == 400).first()
    assert portal_ug.hours_played == 10.0
    assert portal_ug.status == "Jogando"
    assert portal_ug.store == "STEAM"
    assert portal_ug.acquired_at is None

    l4d_ug = db_session.query(UserGame).join(Game).filter(Game.steam_appid == 500).first()
    assert l4d_ug.hours_played == 20.0
    assert l4d_ug.status == "Platinado"
    assert l4d_ug.acquired_at is None

    hl2_ug = db_session.query(UserGame).join(Game).filter(Game.steam_appid == 600).first()
    assert hl2_ug.hours_played == 0.0
    assert hl2_ug.status == "Quero Jogar"
    assert hl2_ug.acquired_at is None


def test_safe_load_json_list():
    from app.utils import safe_load_json_list

    assert safe_load_json_list('["PC", "PS5"]') == ["PC", "PS5"]
    assert safe_load_json_list("PC, PS5") == ["PC", "PS5"]
    assert safe_load_json_list("PC") == ["PC"]
    assert safe_load_json_list(None) == []
    assert safe_load_json_list("") == []
    assert safe_load_json_list(["Nintendo Switch"]) == ["Nintendo Switch"]


def test_store_normalization():
    from app.enums.game_stores import Store
    from app.schemas.game import LibraryGameResponse

    data = {
        "id": "1",
        "user_id": "u1",
        "game_id": "g1",
        "title": "Portal",
        "status": "Jogando",
        "store": "Steam",  # Casing de banco legado
        "favorite": False,
        "platforms": ["PC"],
        "genres": ["Puzzle"],
    }

    response = LibraryGameResponse(**data)
    assert response.store == Store.STEAM
