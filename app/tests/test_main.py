def test_read_root(client):
    """Testa se a API principal está online e respondendo."""
    response = client.get("/")

    assert response.status_code == 200
    assert response.json() == {"message": "VisualMemory API rodando liso, liso!"}
