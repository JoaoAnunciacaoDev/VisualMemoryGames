from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_read_root():
    """Testa se a API está online e devolvendo a mensagem correta."""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "GameLog API rodando liso e protegida!"}


def test_create_user():
    """Testa a rota de criação de usuários."""
    test_user = {
        "username": "testador_implacavel",
        "email": "testador@gamelog.com",
        "password": "senha_super_segura"
    }
    
    response = client.post("/users/", json=test_user)
    
    assert response.status_code == 201
    
    data = response.json()
    assert data["username"] == "testador_implacavel"
    assert data["email"] == "testador@gamelog.com"
    assert "id" in data
    assert "password" not in data