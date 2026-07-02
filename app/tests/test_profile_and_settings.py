from datetime import datetime

from fastapi import status


def test_change_password(client, auth_headers, db_session):
    # Alterar a senha com sucesso
    response = client.put(
        "/users/me/password",
        json={"current_password": "SenhaSegura_123!", "new_password": "NewPassword123!"},
        headers=auth_headers,
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["message"] == "Senha alterada com sucesso."

    # Tentar alterar com a senha atual incorreta
    response = client.put(
        "/users/me/password",
        json={"current_password": "WrongPassword", "new_password": "AnotherPassword123!"},
        headers=auth_headers,
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST


def test_deactivate_and_reactivate_account(client, auth_headers, db_session):
    from app.models.user import User

    # Buscar o usuário criado
    user = db_session.query(User).filter(User.username == "tester").first()
    assert user is not None

    # Desativar a conta
    response = client.post(
        "/users/me/deactivate",
        json={"password": "SenhaSegura_123!"},
        headers=auth_headers,
    )
    assert response.status_code == status.HTTP_200_OK
    assert "desativada com sucesso" in response.json()["message"]

    # Verificar no banco de dados que a conta está marcada como excluída
    db_session.refresh(user)
    assert user.is_deleted is True
    assert user.deleted_at is not None

    # Tentar logar com a conta desativada (deve reativar automaticamente se menor de 15 dias)
    response = client.post(
        "/login",
        data={"username": user.username, "password": "SenhaSegura_123!"}
    )
    assert response.status_code == status.HTTP_200_OK
    assert "access_token" in response.json()

    # Verificar que a conta foi reativada no banco
    db_session.refresh(user)
    assert user.is_deleted is False
    assert user.deleted_at is None


def test_dashboard_data(client, auth_headers, db_session):
    from app.models.game import Game
    from app.models.user import User
    from app.models.user_game import UserGame

    user = db_session.query(User).filter(User.username == "tester").first()
    assert user is not None

    # Criar um jogo na biblioteca do usuário para gerar estatísticas
    new_game = Game(
        title="Test Genre Game",
        genres='["Action", "RPG"]',
        release_year=2024
    )
    db_session.add(new_game)
    db_session.commit()

    user_game = UserGame(
        user_id=user.id,
        game_id=new_game.id,
        status="Zerado",
        hours_played=12.5,
        rating=4.5,
        finished_at=datetime.utcnow().date()
    )
    db_session.add(user_game)
    db_session.commit()

    # Chamar o endpoint do dashboard
    response = client.get(
        "/users/me/dashboard",
        headers=auth_headers,
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["username"] == user.username
    assert data["games_count"] == 1
    assert data["status_distribution"]["Zerado"] == 1
    assert data["most_played_genre"] in ["Action", "RPG"]
    assert len(data["yearly_games"]) == 1
    assert data["yearly_games"][0]["year"] == datetime.utcnow().year
    assert data["yearly_games"][0]["games"][0]["title"] == "Test Genre Game"
    assert data["yearly_games"][0]["games"][0]["hours_played"] == 12.5
