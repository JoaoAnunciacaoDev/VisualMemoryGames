from __future__ import annotations

import asyncio
import logging
import os
import time
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.logging_utils import redact_sensitive
from app.models.sync_job import SyncJob

logger = logging.getLogger("visualmemory.jobs")

PENDING = "pending"
RUNNING = "running"
COMPLETED = "completed"
FAILED = "failed"

GOG_ACCOUNT_SYNC = "gog.account.sync"
STEAM_METADATA_ENRICH = "steam.metadata.enrich"
EPIC_METADATA_ENRICH = "epic.metadata.enrich"
SUPPORTED_JOB_TYPES = {GOG_ACCOUNT_SYNC, STEAM_METADATA_ENRICH, EPIC_METADATA_ENRICH}

db_session_maker = SessionLocal
_worker_task: asyncio.Task | None = None
_worker_stop: asyncio.Event | None = None
_worker_wakeup: asyncio.Event | None = None


def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _merge_active_payload(job: SyncJob, payload: dict[str, Any]) -> None:
    """Acumula itens quando outra solicitação encontra o mesmo job ativo."""
    merged = dict(job.payload or {})
    for key in ("appids", "game_ids"):
        if key in payload:
            merged[key] = list(dict.fromkeys([*merged.get(key, []), *payload.get(key, [])]))
    job.payload = merged
    job.updated_at = utc_now()


def enqueue_job(
    db: Session,
    *,
    user_id: str,
    job_type: str,
    payload: dict[str, Any],
    idempotency_key: str | None = None,
    max_attempts: int = 3,
) -> SyncJob:
    """Persiste um trabalho e devolve o já ativo quando a chave se repete."""
    if job_type not in SUPPORTED_JOB_TYPES:
        raise ValueError(f"Tipo de job não suportado: {job_type}")

    if idempotency_key:
        existing = (
            db.query(SyncJob)
            .filter(
                SyncJob.idempotency_key == idempotency_key,
                SyncJob.status.in_((PENDING, RUNNING)),
            )
            .first()
        )
        if existing:
            if existing.status == RUNNING and existing.payload != payload:
                idempotency_key = None
            else:
                _merge_active_payload(existing, payload)
                db.commit()
                wake_worker()
                return existing

    job = SyncJob(
        user_id=str(user_id),
        job_type=job_type,
        payload=payload,
        idempotency_key=idempotency_key,
        max_attempts=max_attempts,
    )
    db.add(job)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        if not idempotency_key:
            raise
        existing = (
            db.query(SyncJob)
            .filter(
                SyncJob.idempotency_key == idempotency_key,
                SyncJob.status.in_((PENDING, RUNNING)),
            )
            .first()
        )
        if not existing:
            raise
        _merge_active_payload(existing, payload)
        db.commit()
        wake_worker()
        return existing
    db.refresh(job)
    wake_worker()
    return job


def _recover_stale_jobs(db: Session, now: datetime) -> None:
    lease_minutes = max(5, int(os.getenv("JOB_LEASE_MINUTES", "30")))
    stale_before = now - timedelta(minutes=lease_minutes)
    stale_jobs = (
        db.query(SyncJob).filter(SyncJob.status == RUNNING, SyncJob.locked_at < stale_before).all()
    )
    for job in stale_jobs:
        job.status = PENDING
        job.available_at = now
        job.locked_at = None
        job.last_error = "Execução interrompida; job recuperado automaticamente."
    if stale_jobs:
        db.commit()
        logger.warning("Recuperados %s jobs interrompidos.", len(stale_jobs))


def _claim_next_job(db: Session) -> SyncJob | None:
    now = utc_now()
    _recover_stale_jobs(db, now)
    job = (
        db.query(SyncJob)
        .filter(SyncJob.status == PENDING, SyncJob.available_at <= now)
        .order_by(SyncJob.available_at, SyncJob.created_at)
        .with_for_update(skip_locked=True)
        .first()
    )
    if not job:
        return None
    job.status = RUNNING
    job.attempts += 1
    job.locked_at = now
    job.updated_at = now
    job.last_error = None
    db.commit()
    db.refresh(job)
    return job


async def _dispatch_job(job: SyncJob) -> dict[str, Any]:
    payload = job.payload or {}
    if job.job_type == GOG_ACCOUNT_SYNC:
        from app.routers.gog import sync_gog_account_in_background

        result = await sync_gog_account_in_background(str(payload["account_id"]), str(job.user_id))
        return result or {}

    if job.job_type == STEAM_METADATA_ENRICH:
        from app.routers.steam import fetch_game_genres_in_background

        result = await fetch_game_genres_in_background(
            [int(value) for value in payload.get("appids", [])], str(job.user_id)
        )
        return result or {}

    if job.job_type == EPIC_METADATA_ENRICH:
        from app.routers.epic import enrich_games_metadata_in_background

        result = await enrich_games_metadata_in_background(
            [str(value) for value in payload.get("game_ids", [])]
        )
        return result or {}

    raise ValueError(f"Tipo de job não suportado: {job.job_type}")


async def process_next_job() -> bool:
    """Reserva e executa um job. Retorna False quando a fila está vazia."""
    db = db_session_maker()
    try:
        job = _claim_next_job(db)
        if not job:
            return False
        job_id = job.id
        job_snapshot = job
    finally:
        db.close()

    try:
        started_at = time.perf_counter()
        result = await _dispatch_job(job_snapshot)
    except asyncio.CancelledError:
        db = db_session_maker()
        try:
            persisted = db.query(SyncJob).filter(SyncJob.id == job_id).first()
            if persisted:
                now = utc_now()
                persisted.status = PENDING
                persisted.available_at = now
                persisted.locked_at = None
                persisted.updated_at = now
                persisted.last_error = "Execução interrompida durante o encerramento do serviço."
                db.commit()
        finally:
            db.close()
        raise
    except Exception as exc:
        logger.exception(
            "Falha no job %s (%s) após %.1f ms.",
            job_id,
            job_snapshot.job_type,
            (time.perf_counter() - started_at) * 1000,
            extra={"job_type": job_snapshot.job_type},
        )
        db = db_session_maker()
        try:
            persisted = db.query(SyncJob).filter(SyncJob.id == job_id).first()
            if persisted:
                now = utc_now()
                persisted.last_error = redact_sensitive(exc)[:2000]
                persisted.locked_at = None
                persisted.updated_at = now
                if persisted.attempts >= persisted.max_attempts:
                    persisted.status = FAILED
                    persisted.finished_at = now
                else:
                    persisted.status = PENDING
                    persisted.available_at = now + timedelta(
                        seconds=min(300, 15 * (2 ** (persisted.attempts - 1)))
                    )
                db.commit()
        finally:
            db.close()
        return True

    db = db_session_maker()
    try:
        persisted = db.query(SyncJob).filter(SyncJob.id == job_id).first()
        if persisted:
            now = utc_now()
            persisted.status = COMPLETED
            persisted.progress = 100
            persisted.result = result
            persisted.locked_at = None
            persisted.finished_at = now
            persisted.updated_at = now
            db.commit()
    finally:
        db.close()
    logger.info(
        "Job %s (%s) concluído em %.1f ms.",
        job_id,
        job_snapshot.job_type,
        (time.perf_counter() - started_at) * 1000,
        extra={"job_type": job_snapshot.job_type},
    )
    return True


async def _worker_loop() -> None:
    assert _worker_stop is not None
    assert _worker_wakeup is not None
    poll_seconds = max(2, int(os.getenv("JOB_POLL_SECONDS", "10")))
    while not _worker_stop.is_set():
        processed = await process_next_job()
        if processed:
            await asyncio.sleep(0)
            continue
        try:
            await asyncio.wait_for(_worker_wakeup.wait(), timeout=poll_seconds)
        except TimeoutError:
            pass
        _worker_wakeup.clear()


def start_worker() -> asyncio.Task | None:
    global _worker_stop, _worker_task, _worker_wakeup
    if os.getenv("ENVIRONMENT", "development").lower() == "testing":
        return None
    if _worker_task and not _worker_task.done():
        return _worker_task
    _worker_stop = asyncio.Event()
    _worker_wakeup = asyncio.Event()
    _worker_task = asyncio.create_task(_worker_loop(), name="persistent-sync-job-worker")
    return _worker_task


async def stop_worker() -> None:
    global _worker_stop, _worker_task, _worker_wakeup
    if not _worker_task:
        return
    assert _worker_stop is not None
    _worker_stop.set()
    if _worker_wakeup:
        _worker_wakeup.set()
    try:
        await asyncio.wait_for(_worker_task, timeout=10)
    except TimeoutError:
        _worker_task.cancel()
        try:
            await _worker_task
        except asyncio.CancelledError:
            pass
    _worker_task = None
    _worker_stop = None
    _worker_wakeup = None


def wake_worker() -> None:
    if _worker_wakeup:
        _worker_wakeup.set()
