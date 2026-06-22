from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_read_root():
    """Testa se a API está online e devolvendo a mensagem correta."""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "GameLog API rodando liso, liso!"}


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


def test_login_user():
    """Testa se o usuário consegue fazer login e recebe o Token JWT."""
    
    login_data = {
        "username": "testador_implacavel", 
        "password": "senha_super_segura"
    }
    
    response = client.post("/login", data=login_data)
    
    assert response.status_code == 200
    
    json_data = response.json()
    assert "access_token" in json_data
    assert json_data["token_type"] == "bearer"


def test_create_tierlist_without_token():
    """Testa se a API bloqueia a criação de Tier List sem estar logado."""
    
    tierlist_data = {
        "title": "Meus RPGs Favoritos"
    }
    
    response = client.post("/tierlists/", json=tierlist_data)
    
    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated"
    

def test_create_tierlist_with_token():
    """Faz o login, pega o token e testa a criação de uma Tier List com sucesso."""
    
    login_response = client.post("/login", data={
        "username": "testador_implacavel",
        "password": "senha_super_segura"
    })
    token = login_response.json()["access_token"]
    
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    tierlist_data = {
        "title": "Meus RPGs Favoritos"
    }
    
    response = client.post("/tierlists/", json=tierlist_data, headers=headers)
    
    assert response.status_code == 201
    
    data = response.json()
    assert data["title"] == "Meus RPGs Favoritos"
    assert "categories" in data
    assert len(data["categories"]) == 5
    assert data["categories"][0]["name"] == "S"