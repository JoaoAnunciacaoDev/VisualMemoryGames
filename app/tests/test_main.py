def test_read_root(client):
    """Testa se a API principal está online e respondendo."""
    response = client.get("/")

    assert response.status_code == 200
    assert response.json() == {"message": "VisualMemory API rodando liso, liso!"}


def test_health_check(client):
    """Testa se o endpoint de health check está respondendo 200 OK."""
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

