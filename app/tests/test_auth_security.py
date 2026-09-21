from app.models.user import User


def test_logout_revokes_tokens_from_other_sessions(client, db_session):
    client.post(
        "/users/register/initiate",
        json={
            "username": "sessions",
            "email": "sessions@example.com",
            "password": "SenhaSegura_123!",
        },
    )
    client.post(
        "/users/",
        json={
            "username": "sessions",
            "email": "sessions@example.com",
            "password": "SenhaSegura_123!",
            "code": "123456",
        },
    )
    first_login = client.post(
        "/login", data={"username": "sessions", "password": "SenhaSegura_123!"}
    )
    first_token = first_login.cookies["token"]
    client.post("/login", data={"username": "sessions", "password": "SenhaSegura_123!"})

    assert client.get(
        "/users/me", headers={"Authorization": f"Bearer {first_token}"}
    ).status_code == 200
    assert client.post("/logout").status_code == 200
    assert client.get(
        "/users/me", headers={"Authorization": f"Bearer {first_token}"}
    ).status_code == 401


def test_deleted_user_is_rejected_even_with_valid_token(client, auth_headers, db_session):
    user = db_session.query(User).filter(User.username == "tester").one()
    user.is_deleted = True
    db_session.commit()

    assert client.get("/users/me", headers=auth_headers).status_code == 401


def test_users_listing_exposes_only_public_fields(client, auth_headers, db_session):
    user = db_session.query(User).filter(User.username == "tester").one()
    user.is_public = True
    db_session.commit()

    response = client.get("/users/", headers=auth_headers)

    assert response.status_code == 200
    assert response.json()
    assert set(response.json()[0]).isdisjoint(
        {"email", "is_admin", "is_deleted", "last_active_at"}
    )


def test_email_change_requires_confirmation(client, auth_headers):
    unconfirmed = client.put(
        "/users/me",
        json={"email": "new-address@example.com"},
        headers=auth_headers,
    )
    assert unconfirmed.status_code == 400

    initiated = client.post(
        "/users/me/email/initiate",
        json={"email": "new-address@example.com"},
        headers=auth_headers,
    )
    assert initiated.status_code == 200

    confirmed = client.put(
        "/users/me",
        json={"email": "new-address@example.com", "email_code": "123456"},
        headers=auth_headers,
    )
    assert confirmed.status_code == 200
    assert confirmed.json()["email"] == "new-address@example.com"
