import pytest

from app.models.user import User


@pytest.fixture
def admin_headers(client, db_session):
    """Cria um usuário administrador e retorna os headers com token."""
    # Criar admin
    client.post(
        "/users/register/initiate",
        json={
            "username": "adminuser",
            "email": "admin@visualmemory.com",
            "password": "SenhaSegura_123!",
        },
    )
    client.post(
        "/users/",
        json={
            "username": "adminuser",
            "email": "admin@visualmemory.com",
            "password": "SenhaSegura_123!",
            "code": "123456",
        },
    )

    # Set as admin in DB
    user = db_session.query(User).filter(User.email == "admin@visualmemory.com").first()
    user.is_admin = True
    db_session.commit()

    # Login
    login = client.post("/login", data={"username": "adminuser", "password": "SenhaSegura_123!"})
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_get_stats_forbidden_for_normal_users(client, auth_headers):
    response = client.get("/admin/stats", headers=auth_headers)
    assert response.status_code == 403
    assert "Acesso negado" in response.json()["detail"]


def test_get_stats_success(client, admin_headers):
    response = client.get("/admin/stats", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert "total_users" in data
    assert "active_users" in data
    assert "inactive_users" in data
    assert "admin_users" in data
    assert data["admin_users"] >= 1


def test_list_users_forbidden_for_normal_users(client, auth_headers):
    response = client.get("/admin/users", headers=auth_headers)
    assert response.status_code == 403


def test_list_users_success(client, admin_headers):
    response = client.get("/admin/users", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    # Check if admin and default user are returned
    usernames = [u["username"] for u in data]
    assert "adminuser" in usernames


def test_list_users_search(client, admin_headers):
    # Search for admin
    response = client.get("/admin/users?search=adminuser", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["username"] == "adminuser"


def test_toggle_active_user(client, admin_headers, db_session):
    # 1. Create a third user to toggle
    client.post(
        "/users/register/initiate",
        json={
            "username": "toggleuser",
            "email": "toggle@visualmemory.com",
            "password": "SenhaSegura_123!",
        },
    )
    client.post(
        "/users/",
        json={
            "username": "toggleuser",
            "email": "toggle@visualmemory.com",
            "password": "SenhaSegura_123!",
            "code": "123456",
        },
    )
    user = db_session.query(User).filter(User.email == "toggle@visualmemory.com").first()
    user_id = user.id

    # 2. Toggle to inactive
    response = client.post(f"/admin/users/{user_id}/toggle-active", headers=admin_headers)
    assert response.status_code == 200
    assert response.json()["is_deleted"] is True

    # 3. Toggle to active
    response = client.post(f"/admin/users/{user_id}/toggle-active", headers=admin_headers)
    assert response.status_code == 200
    assert response.json()["is_deleted"] is False


def test_toggle_active_self_forbidden(client, admin_headers, db_session):
    admin = db_session.query(User).filter(User.email == "admin@visualmemory.com").first()
    admin_id = admin.id

    response = client.post(f"/admin/users/{admin_id}/toggle-active", headers=admin_headers)
    assert response.status_code == 400
    assert "Você não pode desativar sua própria conta" in response.json()["detail"]


def test_toggle_admin_user(client, admin_headers, db_session):
    client.post(
        "/users/register/initiate",
        json={
            "username": "promoteduser",
            "email": "promote@visualmemory.com",
            "password": "SenhaSegura_123!",
        },
    )
    client.post(
        "/users/",
        json={
            "username": "promoteduser",
            "email": "promote@visualmemory.com",
            "password": "SenhaSegura_123!",
            "code": "123456",
        },
    )
    user = db_session.query(User).filter(User.email == "promote@visualmemory.com").first()
    user_id = user.id

    # 1. Promote to admin
    response = client.post(f"/admin/users/{user_id}/toggle-admin", headers=admin_headers)
    assert response.status_code == 200
    assert response.json()["is_admin"] is True

    # 2. Demote from admin
    response = client.post(f"/admin/users/{user_id}/toggle-admin", headers=admin_headers)
    assert response.status_code == 200
    assert response.json()["is_admin"] is False


def test_toggle_admin_self_forbidden(client, admin_headers, db_session):
    admin = db_session.query(User).filter(User.email == "admin@visualmemory.com").first()
    admin_id = admin.id

    response = client.post(f"/admin/users/{admin_id}/toggle-admin", headers=admin_headers)
    assert response.status_code == 400
    assert "Você não pode revogar seus próprios privilégios" in response.json()["detail"]


def test_hard_delete_user(client, admin_headers, db_session):
    client.post(
        "/users/register/initiate",
        json={
            "username": "deleteuser",
            "email": "delete@visualmemory.com",
            "password": "SenhaSegura_123!",
        },
    )
    client.post(
        "/users/",
        json={
            "username": "deleteuser",
            "email": "delete@visualmemory.com",
            "password": "SenhaSegura_123!",
            "code": "123456",
        },
    )
    user = db_session.query(User).filter(User.email == "delete@visualmemory.com").first()
    user_id = user.id

    # Hard delete
    response = client.delete(f"/admin/users/{user_id}", headers=admin_headers)
    assert response.status_code == 204

    # Verify deleted from DB
    db_session.expire_all()
    user_check = db_session.query(User).filter(User.id == user_id).first()
    assert user_check is None
