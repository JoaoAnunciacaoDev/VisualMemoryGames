from datetime import timedelta

import httpx
import pytest

from app.models.external_api_cache import ExternalApiCache
from app.services import http_client
from app.services.external_cache import get_cached, prune_expired_cache, set_cached, utc_now


def test_health_is_liveness_and_request_id_is_propagated(client):
    response = client.get("/health", headers={"X-Request-ID": "cron-render-123"})
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    assert response.headers["X-Request-ID"] == "cron-render-123"


def test_readiness_checks_database(client):
    response = client.get("/ready")
    assert response.status_code == 200
    assert response.json() == {"status": "ready"}


def test_readiness_reports_database_failure(client, db_session, monkeypatch):
    def fail_execute(*_args, **_kwargs):
        raise RuntimeError("database offline")

    monkeypatch.setattr(db_session, "execute", fail_execute)
    response = client.get("/ready")
    assert response.status_code == 503
    assert response.json()["detail"] == "Banco de dados indisponível."


def test_internal_metrics_requires_secret(client, monkeypatch):
    monkeypatch.setenv("INTERNAL_CRON_SECRET", "metrics-secret")
    assert client.get("/internal/metrics").status_code == 401
    response = client.get("/internal/metrics", headers={"X-Cron-Secret": "metrics-secret"})
    assert response.status_code == 200
    assert "requests_total" in response.json()
    assert "jobs_by_status" in response.json()


def test_external_cache_expires(db_session):
    set_cached("test", "key", {"value": 1}, ttl_seconds=60, db=db_session)
    assert get_cached("test", "key", db=db_session) == {"value": 1}

    row = db_session.query(ExternalApiCache).filter_by(provider="test", cache_key="key").one()
    row.expires_at = utc_now() - timedelta(seconds=1)
    db_session.commit()
    assert get_cached("test", "key", db=db_session) is None


def test_expired_external_cache_is_pruned_in_bounded_batches(db_session):
    for index in range(3):
        set_cached("expired", str(index), {"value": index}, ttl_seconds=60, db=db_session)
    db_session.query(ExternalApiCache).update(
        {ExternalApiCache.expires_at: utc_now() - timedelta(seconds=1)}
    )
    db_session.commit()

    assert prune_expired_cache(limit=2, db=db_session) == 2
    assert db_session.query(ExternalApiCache).filter_by(provider="expired").count() == 1
    assert prune_expired_cache(limit=2, db=db_session) == 1


def test_default_cache_pruning_removes_all_expired_rows(db_session):
    for index in range(3):
        set_cached("expired-all", str(index), {"value": index}, ttl_seconds=60, db=db_session)
    set_cached("still-valid", "key", {"value": True}, ttl_seconds=60, db=db_session)
    db_session.query(ExternalApiCache).filter_by(provider="expired-all").update(
        {ExternalApiCache.expires_at: utc_now() - timedelta(seconds=1)}
    )
    db_session.commit()

    assert prune_expired_cache(db=db_session) == 3
    assert db_session.query(ExternalApiCache).filter_by(provider="expired-all").count() == 0
    assert db_session.query(ExternalApiCache).filter_by(provider="still-valid").count() == 1


def test_production_cookie_requests_reject_cross_site_origin(client, monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")
    client.cookies.set("token", "cookie-authentication-token")

    blocked = client.post("/logout", headers={"Origin": "https://attacker.example"})
    assert blocked.status_code == 403

    allowed = client.post("/logout", headers={"Origin": "http://localhost:5173"})
    assert allowed.status_code == 200


@pytest.mark.anyio
async def test_http_client_retries_429_and_honors_retry_after(monkeypatch):
    attempts = 0

    def handler(request):
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            return httpx.Response(429, headers={"Retry-After": "0"}, request=request)
        return httpx.Response(200, json={"ok": True}, request=request)

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    monkeypatch.setattr(http_client, "_async_client", client)
    monkeypatch.setenv("HTTP_MAX_ATTEMPTS", "2")
    response = await http_client.request_async("GET", "https://provider.test/data")
    assert response.status_code == 200
    assert attempts == 2
    await client.aclose()
    monkeypatch.setattr(http_client, "_async_client", None)


def test_http_client_stops_after_timeout_budget(monkeypatch):
    attempts = 0

    def handler(request):
        nonlocal attempts
        attempts += 1
        raise httpx.ReadTimeout("provider timeout", request=request)

    client = httpx.Client(transport=httpx.MockTransport(handler))
    monkeypatch.setattr(http_client, "_sync_client", client)
    monkeypatch.setattr(http_client.time, "sleep", lambda _seconds: None)
    monkeypatch.setenv("HTTP_MAX_ATTEMPTS", "2")
    with pytest.raises(httpx.ReadTimeout):
        http_client.request_sync("GET", "https://provider.test/data")
    assert attempts == 2
    client.close()
    monkeypatch.setattr(http_client, "_sync_client", None)
