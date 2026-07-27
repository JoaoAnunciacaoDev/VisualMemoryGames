from fastapi.testclient import TestClient

from app.models.activity import Activity
from app.models.follow import Follow
from app.models.game import Game
from app.models.user import User


def test_update_visibility(client: TestClient, db_session, auth_headers):
    # Get tester user
    tester = db_session.query(User).filter_by(username="tester").first()

    # Por padrão is_public é False
    assert not tester.is_public

    # Atualiza para True
    response = client.patch(
        "/users/me/visibility",
        headers=auth_headers,
        json={"is_public": True},
    )
    assert response.status_code == 200
    assert response.json()["is_public"]

    # Verifica no BD
    db_session.refresh(tester)
    assert tester.is_public


def test_search_public_users(client: TestClient, db_session, auth_headers):
    # Criar um usuário público e um privado
    user_public = User(
        username="publicuser", email="public@example.com", password_hash="123", is_public=True
    )
    user_private = User(
        username="privateuser", email="private@example.com", password_hash="123", is_public=False
    )
    db_session.add(user_public)
    db_session.add(user_private)
    db_session.commit()

    # Buscar
    response = client.get("/social/users/search?q=user", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()

    # Deve retornar o publico e não o privado, e não o usuário atual (que tbm tem 'user' no nome)
    usernames = [u["username"] for u in data]
    assert "publicuser" in usernames
    assert "privateuser" not in usernames


def test_follow_and_unfollow(client: TestClient, db_session, auth_headers):
    tester = db_session.query(User).filter_by(username="tester").first()

    # Criar outro usuário público
    user2 = User(username="user2", email="user2@example.com", password_hash="123", is_public=True)
    db_session.add(user2)
    db_session.commit()
    db_session.refresh(user2)

    # Seguir
    response = client.post(f"/social/users/{user2.id}/follow", headers=auth_headers)
    assert response.status_code == 204

    # Verificar banco
    follow = db_session.query(Follow).filter(Follow.follower_id == tester.id).first()
    assert follow is not None
    assert follow.following_id == user2.id

    # Deixar de seguir
    response = client.delete(f"/social/users/{user2.id}/follow", headers=auth_headers)
    assert response.status_code == 204
    follow = db_session.query(Follow).filter(Follow.follower_id == tester.id).first()
    assert follow is None


def test_cannot_follow_private_user(client: TestClient, db_session, auth_headers):
    # Criar usuário privado
    user3 = User(username="user3", email="user3@example.com", password_hash="123", is_public=False)
    db_session.add(user3)
    db_session.commit()
    db_session.refresh(user3)

    # Tentar Seguir
    response = client.post(f"/social/users/{user3.id}/follow", headers=auth_headers)
    assert response.status_code == 400


def test_get_profile(client: TestClient, db_session, auth_headers):
    user4 = User(username="user4", email="user4@example.com", password_hash="123", is_public=True)
    db_session.add(user4)
    db_session.commit()

    response = client.get(f"/social/users/{user4.id}/profile", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["username"] == "user4"
    assert response.json()["is_public"]


def test_get_feed_and_activity_creation(client: TestClient, db_session, auth_headers):
    tester = db_session.query(User).filter_by(username="tester").first()

    # Criar jogo
    game = Game(external_id=999, title="Test Game")
    db_session.add(game)

    # Criar usuário 2 público
    user2 = User(username="feeduser", email="feed@example.com", password_hash="123", is_public=True)
    db_session.add(user2)
    db_session.commit()
    db_session.refresh(user2)
    db_session.refresh(game)

    # Seguir usuário 2 (bypass API for speed)
    db_session.add(Follow(follower_id=tester.id, following_id=user2.id))

    # Criar atividade para user2
    activity = Activity(user_id=user2.id, game_id=game.id, action_type="ADDED")
    db_session.add(activity)
    db_session.commit()

    # Pegar feed
    response = client.get("/social/feed", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()

    activities = data["activities"]
    assert len(activities) > 0
    assert activities[0]["user_id"] == str(user2.id)
    assert activities[0]["action_type"] == "ADDED"
    assert activities[0]["game"]["title"] == "Test Game"

    # Releases do RAWG devem estar presentes (depende do mock se estiver mockado)
    assert "rawg_releases" in data


def test_get_followers_and_following(client: TestClient, db_session, auth_headers):
    tester = db_session.query(User).filter_by(username="tester").first()

    # Criar user2 e user3
    user2 = User(
        username="followuser2", email="follow2@example.com", password_hash="123", is_public=True
    )
    user3 = User(
        username="followuser3", email="follow3@example.com", password_hash="123", is_public=True
    )
    db_session.add_all([user2, user3])
    db_session.commit()
    db_session.refresh(user2)
    db_session.refresh(user3)

    # tester segue user2
    # user3 segue tester
    db_session.add(Follow(follower_id=tester.id, following_id=user2.id))
    db_session.add(Follow(follower_id=user3.id, following_id=tester.id))
    db_session.commit()

    # Verificar quem eu sigo (tester)
    res_following = client.get("/social/users/me/following", headers=auth_headers)
    assert res_following.status_code == 200
    following_data = res_following.json()
    assert len(following_data) == 1
    assert following_data[0]["username"] == "followuser2"

    # Verificar meus seguidores (tester)
    res_followers = client.get("/social/users/me/followers", headers=auth_headers)
    assert res_followers.status_code == 200
    followers_data = res_followers.json()
    assert len(followers_data) == 1
    assert followers_data[0]["username"] == "followuser3"

    # Verificar se as tags de "is_following" funcionam para a resposta
    # tester segue user2, entao quando consultar followers de user3, deve ver que não segue user3
    res_followers_user2 = client.get(f"/social/users/{user2.id}/followers", headers=auth_headers)
    assert res_followers_user2.status_code == 200
    assert res_followers_user2.json()[0]["username"] == "tester"


def test_new_activities_and_my_activities_endpoint(client: TestClient, db_session, auth_headers):
    # 1. Test Follow activity
    user2 = User(
        username="targetuser", email="target@example.com", password_hash="123", is_public=True
    )
    db_session.add(user2)
    db_session.commit()
    db_session.refresh(user2)

    # Follow
    client.post(f"/social/users/{user2.id}/follow", headers=auth_headers)

    # Check activities/me endpoint
    resp = client.get("/social/activities/me", headers=auth_headers)
    assert resp.status_code == 200
    activities = resp.json()
    follow_act = next((a for a in activities if a["action_type"] == "FOLLOW"), None)
    assert follow_act is not None
    assert follow_act["target_user"]["username"] == "targetuser"

    # Unfollow
    client.delete(f"/social/users/{user2.id}/follow", headers=auth_headers)
    resp = client.get("/social/activities/me", headers=auth_headers)
    activities = resp.json()
    follow_act = next((a for a in activities if a["action_type"] == "FOLLOW"), None)
    assert follow_act is None

    # 2. Test TierList activities
    # Create public tier list
    tl_resp = client.post(
        "/tierlists/", json={"title": "Public TL", "is_public": True}, headers=auth_headers
    )
    assert tl_resp.status_code == 201
    tl_id = tl_resp.json()["id"]

    resp = client.get("/social/activities/me", headers=auth_headers)
    activities = resp.json()
    create_act = next((a for a in activities if a["action_type"] == "CREATED_TIERLIST"), None)
    assert create_act is not None
    assert create_act["tierlist_title"] == "Public TL"

    # Update public tier list
    client.put(f"/tierlists/{tl_id}", json={"title": "Updated TL"}, headers=auth_headers)
    resp = client.get("/social/activities/me", headers=auth_headers)
    activities = resp.json()
    update_act = next((a for a in activities if a["action_type"] == "UPDATED_TIERLIST"), None)
    assert update_act is not None

    # Turn private
    client.put(f"/tierlists/{tl_id}", json={"is_public": False}, headers=auth_headers)
    resp = client.get("/social/activities/me", headers=auth_headers)
    activities = resp.json()
    # Should delete all activities for this tierlist
    tl_acts = [a for a in activities if a["tierlist_id"] == tl_id]
    assert len(tl_acts) == 0

    # 3. Test RATED activity with notes (commentary)
    # Create game
    game = Game(external_id=9999, title="Rated Game")
    db_session.add(game)
    db_session.commit()
    db_session.refresh(game)

    # Post add game first (no rating initially)
    add_resp = client.post(
        "/user-games/",
        json={
            "game_id": game.id,
            "status": "Quero Jogar"
        },
        headers=auth_headers
    )
    assert add_resp.status_code == 201
    ug_id = add_resp.json()["id"]

    # Rate and add review notes via PUT
    client.put(
        f"/user-games/{ug_id}",
        json={
            "status": "Zerado",
            "rating": 5,
            "notes": "Jogo maravilhoso!"
        },
        headers=auth_headers
    )

    resp = client.get("/social/activities/me", headers=auth_headers)
    activities = resp.json()
    rated_act = next((a for a in activities if a["action_type"] == "RATED"), None)
    assert rated_act is not None
    assert rated_act["context"] == "5.0"
    assert rated_act["commentary"] == "Jogo maravilhoso!"

    # 4. Test year/month query filters on /social/activities/me
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    current_month = now.month
    current_year = now.year

    # Request current month/year -> should return the activities
    resp_filtered = client.get(
        f"/social/activities/me?month={current_month}&year={current_year}",
        headers=auth_headers
    )
    assert resp_filtered.status_code == 200
    assert len(resp_filtered.json()) > 0

    # Request a different month/year -> should return 0 activities
    diff_month = 1 if current_month == 12 else current_month + 1
    diff_year = current_year - 1
    resp_empty = client.get(
        f"/social/activities/me?month={diff_month}&year={diff_year}",
        headers=auth_headers
    )
    assert resp_empty.status_code == 200
    assert len(resp_empty.json()) == 0
