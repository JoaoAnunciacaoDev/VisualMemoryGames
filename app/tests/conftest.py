import os

os.environ["SECRET_KEY"] = "test-secret-key-with-exactly-32-bytes-long"
os.environ["ENVIRONMENT"] = "development"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    app.state.limiter.reset()
    
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def auth_headers(client):
    """Cria um usuário padrão e retorna os headers com o Token JWT."""
    client.post("/users/", json={
        "username": "tester",
        "email": "tester@gamelog.com",
        "password": "SenhaSegura_123!"
    })

    login = client.post("/login", data={
        "username": "tester",
        "password": "SenhaSegura_123!"
    })
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def second_user_headers(client):
    """Cria um segundo usuário para testar regras de segurança/permissão."""
    client.post("/users/", json={
        "username": "invasor",
        "email": "invasor@gamelog.com",
        "password": "SenhaSegura_123!"
    })

    login = client.post("/login", data={
        "username": "invasor",
        "password": "SenhaSegura_123!"
    })
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def created_game(client, auth_headers):
    """Cria um jogo no catálogo (manual) e retorna os dados."""
    response = client.post("/games/manual", data={
        "title": "Test Game",
        "platforms": "[]",
        "genres": "[]"
    }, headers=auth_headers)
    assert response.status_code == 201
    return response.json()


@pytest.fixture
def user_game(client, auth_headers):
    """Cria um jogo manual e adiciona-o à biblioteca do utilizador."""
    game_resp = client.post("/games/manual", data={
        "title": "Test Game",
        "platforms": "[]",
        "genres": "[]"
    }, headers=auth_headers)
    game_id = game_resp.json()["id"]
    
    ug_resp = client.post("/user-games/", json={"game_id": game_id}, headers=auth_headers)
    return ug_resp.json()