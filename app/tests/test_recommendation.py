from unittest.mock import patch

from app.models.game import Game
from app.models.user import User
from app.models.user_game import UserGame


def test_get_recommendations(client, db_session, auth_headers):
    # 1. Criar jogos base no banco
    g_witcher = Game(
        external_id=101,
        title="Witcher 3",
        genres=["RPG", "Action"],
        platforms=["PC"],
    )
    g_hades = Game(
        external_id=102,
        title="Hades",
        genres=["Action", "Roguelike"],
        platforms=["PC"],
    )
    db_session.add_all([g_witcher, g_hades])
    db_session.commit()

    # Obter o usuário atual
    user = db_session.query(User).filter(User.username == "tester").first()

    # Associar jogos à biblioteca do usuário
    ug_witcher = UserGame(
        user_id=user.id,
        game_id=g_witcher.id,
        favorite=True,
        status="Finalizado",
        rating=10.0,
    )
    ug_hades = UserGame(
        user_id=user.id,
        game_id=g_hades.id,
        favorite=False,
        status="Jogando",
    )
    db_session.add_all([ug_witcher, ug_hades])
    db_session.commit()

    # Criar um jogo que outro usuário possui (para recomendação local)
    g_cyberpunk = Game(
        external_id=103,
        title="Cyberpunk 2077",
        genres=["RPG", "Action"],
        platforms=["PC"],
    )
    db_session.add(g_cyberpunk)
    db_session.commit()

    user_other = User(
        username="other_user",
        email="other@test.com",
        password_hash="hashed_password",
    )
    db_session.add(user_other)
    db_session.commit()

    ug_other = UserGame(user_id=user_other.id, game_id=g_cyberpunk.id, status="Jogando")
    db_session.add(ug_other)
    db_session.commit()

    # 2. Mockar o retorno da API RAWG para testar o fallback paralelo
    call_count = 0
    def mock_get_games_side_effect(genres, page_size=20):
        nonlocal call_count
        call_count += 1
        return [
            {
                "external_id": 200 + call_count * 10 + i,
                "title": f"Mock Game {call_count}_{i}",
                "cover_url": f"http://image.url/{call_count}_{i}.jpg",
                "release_year": 2000 + call_count,
                "platforms": ["PC"],
                "genres": [genres],
            }
            for i in range(5)
        ]

    with patch(
        "app.services.recommendation_service.get_games_by_genres_rawg",
        side_effect=mock_get_games_side_effect,
    ) as mock_get_games:
        response = client.get("/users/me/recommendations", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()

        # Deve retornar pelo menos alguns carrosséis de recomendação
        assert len(data) > 0

        # Verificar se os títulos dos carrosséis estão de acordo com o perfil
        carousel_titles = [c["title"] for c in data]
        assert any("jogando Hades" in t for t in carousel_titles)
        assert any("gêneros favoritos" in t for t in carousel_titles)
        assert any("favoritou Witcher 3" in t for t in carousel_titles)

        # Garantir que os jogos recomendados não se duplicam nos carrosséis
        recommended_external_ids = []
        for carousel in data:
            assert "games" in carousel
            for game in carousel["games"]:
                # Não pode recomendar jogos que o próprio usuário já tem
                assert game["external_id"] not in {101, 102}
                recommended_external_ids.append(game["external_id"])

        # Desduplicação de recomendações na mesma resposta
        assert len(recommended_external_ids) == len(set(recommended_external_ids))

        # Garantir que a chamada para a API RAWG foi feita
        assert mock_get_games.called

        # Verificar se os jogos do RAWG foram persistidos localmente
        persisted_game = (
            db_session.query(Game).filter(Game.external_id == 210).first()
        )
        assert persisted_game is not None
        assert persisted_game.title == "Mock Game 1_0"
