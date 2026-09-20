import asyncio
from datetime import timedelta

import pytest
from alembic.config import Config
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker

from alembic import command
from app.models.sync_job import SyncJob
from app.models.user import User
from app.services import job_service
from app.services.job_service import EPIC_METADATA_ENRICH, enqueue_job, utc_now


def test_enqueue_is_idempotent_and_merges_payload(db_session, auth_headers):
    user = db_session.query(User).filter(User.username == "tester").one()

    first = enqueue_job(
        db_session,
        user_id=user.id,
        job_type=EPIC_METADATA_ENRICH,
        payload={"game_ids": ["game-1"]},
        idempotency_key=f"epic-metadata:{user.id}",
    )
    second = enqueue_job(
        db_session,
        user_id=user.id,
        job_type=EPIC_METADATA_ENRICH,
        payload={"game_ids": ["game-1", "game-2"]},
        idempotency_key=f"epic-metadata:{user.id}",
    )

    assert second.id == first.id
    assert db_session.query(SyncJob).count() == 1
    assert second.payload["game_ids"] == ["game-1", "game-2"]


def test_claiming_job_prevents_second_worker_from_claiming_same_job(
    db_session, auth_headers
):
    user = db_session.query(User).filter(User.username == "tester").one()
    job = enqueue_job(
        db_session,
        user_id=user.id,
        job_type=EPIC_METADATA_ENRICH,
        payload={"game_ids": ["game-1"]},
    )
    maker = sessionmaker(bind=db_session.bind)
    first_worker = maker()
    second_worker = maker()
    try:
        claimed = job_service._claim_next_job(first_worker)
        duplicate = job_service._claim_next_job(second_worker)
        assert claimed is not None
        assert claimed.id == job.id
        assert duplicate is None
    finally:
        first_worker.close()
        second_worker.close()


@pytest.mark.anyio
async def test_worker_completes_a_job(db_session, auth_headers, monkeypatch):
    user = db_session.query(User).filter(User.username == "tester").one()
    job = enqueue_job(
        db_session,
        user_id=user.id,
        job_type=EPIC_METADATA_ENRICH,
        payload={"game_ids": ["game-1"]},
    )
    monkeypatch.setattr(job_service, "db_session_maker", lambda: db_session)

    async def successful_dispatch(_job):
        return {"updated_count": 1}

    monkeypatch.setattr(job_service, "_dispatch_job", successful_dispatch)
    assert await job_service.process_next_job() is True

    db_session.expire_all()
    persisted = db_session.query(SyncJob).filter(SyncJob.id == job.id).one()
    assert persisted.status == job_service.COMPLETED
    assert persisted.progress == 100
    assert persisted.result == {"updated_count": 1}


@pytest.mark.anyio
async def test_worker_retries_then_marks_job_failed(db_session, auth_headers, monkeypatch):
    user = db_session.query(User).filter(User.username == "tester").one()
    job = enqueue_job(
        db_session,
        user_id=user.id,
        job_type=EPIC_METADATA_ENRICH,
        payload={"game_ids": ["game-1"]},
        max_attempts=2,
    )
    monkeypatch.setattr(job_service, "db_session_maker", lambda: db_session)

    async def failed_dispatch(_job):
        raise RuntimeError("token=should-not-leak")

    monkeypatch.setattr(job_service, "_dispatch_job", failed_dispatch)
    assert await job_service.process_next_job() is True

    persisted = db_session.query(SyncJob).filter(SyncJob.id == job.id).one()
    assert persisted.status == job_service.PENDING
    assert "should-not-leak" not in persisted.last_error
    persisted.available_at = utc_now() - timedelta(seconds=1)
    db_session.commit()

    assert await job_service.process_next_job() is True
    db_session.expire_all()
    persisted = db_session.query(SyncJob).filter(SyncJob.id == job.id).one()
    assert persisted.status == job_service.FAILED
    assert persisted.attempts == 2


@pytest.mark.anyio
async def test_cancelled_worker_requeues_the_job(db_session, auth_headers, monkeypatch):
    user = db_session.query(User).filter(User.username == "tester").one()
    job = enqueue_job(
        db_session,
        user_id=user.id,
        job_type=EPIC_METADATA_ENRICH,
        payload={"game_ids": ["game-1"]},
    )
    monkeypatch.setattr(job_service, "db_session_maker", lambda: db_session)

    async def cancelled_dispatch(_job):
        raise asyncio.CancelledError

    monkeypatch.setattr(job_service, "_dispatch_job", cancelled_dispatch)
    with pytest.raises(asyncio.CancelledError):
        await job_service.process_next_job()

    persisted = db_session.query(SyncJob).filter(SyncJob.id == job.id).one()
    assert persisted.status == job_service.PENDING
    assert persisted.locked_at is None


def test_job_endpoints_only_expose_the_owner(client, auth_headers, second_user_headers, db_session):
    user = db_session.query(User).filter(User.username == "tester").one()
    job = enqueue_job(
        db_session,
        user_id=user.id,
        job_type=EPIC_METADATA_ENRICH,
        payload={"game_ids": []},
    )

    response = client.get("/users/me/jobs", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()[0]["id"] == job.id

    forbidden = client.get(f"/users/me/jobs/{job.id}", headers=second_user_headers)
    assert forbidden.status_code == 404


def test_internal_worker_trigger_requires_secret(client, monkeypatch):
    monkeypatch.setenv("INTERNAL_CRON_SECRET", "cron-secret-value")
    assert client.post("/internal/jobs/process").status_code == 401
    response = client.post("/internal/jobs/process", headers={"X-Cron-Secret": "cron-secret-value"})
    assert response.status_code == 200
    assert response.json() == {"status": "accepted"}


def test_sync_jobs_migration_upgrade_and_downgrade(tmp_path, monkeypatch):
    database_path = tmp_path / "phase3-migration.db"
    database_url = f"sqlite:///{database_path.as_posix()}"
    monkeypatch.setenv("DATABASE_URL", database_url)
    config = Config("alembic.ini")

    command.upgrade(config, "head")
    engine = create_engine(database_url)
    inspector = inspect(engine)
    assert "sync_jobs" in inspector.get_table_names()
    assert "game_provider_ids" in inspector.get_table_names()
    assert {
        "ix_sync_jobs_status_available_at",
        "ix_sync_jobs_user_created_at",
        "uq_sync_jobs_active_idempotency_key",
    }.issubset({index["name"] for index in inspector.get_indexes("sync_jobs")})
    command.check(config)

    command.downgrade(config, "d3b7f91e2a4c")
    assert "sync_jobs" not in inspect(engine).get_table_names()
    assert "game_provider_ids" not in inspect(engine).get_table_names()
    engine.dispose()
