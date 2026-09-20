from __future__ import annotations

import hashlib
import json
import logging
import threading
import time
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.external_api_cache import ExternalApiCache

logger = logging.getLogger("visualmemory.external_cache")
db_session_maker = SessionLocal
_prune_lock = threading.Lock()
_last_prune_at = 0.0


def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def build_cache_key(*parts: object) -> str:
    serialized = json.dumps(parts, sort_keys=True, ensure_ascii=True, default=str)
    return hashlib.sha256(serialized.encode()).hexdigest()


def prune_expired_cache(*, limit: int | None = None, db: Session | None = None) -> int:
    owns_session = db is None
    session = db or db_session_maker()
    try:
        expired_query = session.query(ExternalApiCache).filter(
            ExternalApiCache.expires_at <= utc_now()
        )
        if limit is None:
            deleted = expired_query.delete(synchronize_session=False)
        else:
            expired_ids = [
                row[0]
                for row in session.query(ExternalApiCache.id)
                .filter(ExternalApiCache.expires_at <= utc_now())
                .order_by(ExternalApiCache.expires_at)
                .limit(max(1, min(limit, 5000)))
                .all()
            ]
            if not expired_ids:
                return 0
            deleted = (
                session.query(ExternalApiCache)
                .filter(ExternalApiCache.id.in_(expired_ids))
                .delete(synchronize_session=False)
            )
        session.commit()
        return deleted
    except Exception as exc:
        session.rollback()
        logger.debug("Não foi possível limpar o cache expirado: %s", exc)
        return 0
    finally:
        if owns_session:
            session.close()


def _maybe_prune_expired_cache(db: Session | None = None) -> None:
    global _last_prune_at
    now = time.monotonic()
    if now - _last_prune_at < 3600 or not _prune_lock.acquire(blocking=False):
        return
    try:
        if now - _last_prune_at >= 3600:
            prune_expired_cache(db=db)
            _last_prune_at = now
    finally:
        _prune_lock.release()


def get_cached(provider: str, cache_key: str, db: Session | None = None) -> Any | None:
    owns_session = db is None
    session = db or db_session_maker()
    try:
        row = (
            session.query(ExternalApiCache)
            .filter(
                ExternalApiCache.provider == provider,
                ExternalApiCache.cache_key == cache_key,
                ExternalApiCache.expires_at > utc_now(),
            )
            .first()
        )
        return row.payload if row else None
    except Exception as exc:
        session.rollback()
        logger.debug("Cache externo indisponível: %s", exc)
        return None
    finally:
        if owns_session:
            session.close()


def set_cached(
    provider: str,
    cache_key: str,
    payload: Any,
    *,
    ttl_seconds: int,
    db: Session | None = None,
) -> None:
    _maybe_prune_expired_cache(db=db)
    owns_session = db is None
    session = db or db_session_maker()
    try:
        row = (
            session.query(ExternalApiCache)
            .filter(
                ExternalApiCache.provider == provider,
                ExternalApiCache.cache_key == cache_key,
            )
            .first()
        )
        expires_at = utc_now() + timedelta(seconds=max(1, ttl_seconds))
        if row:
            row.payload = payload
            row.expires_at = expires_at
            row.updated_at = utc_now()
        else:
            session.add(
                ExternalApiCache(
                    provider=provider,
                    cache_key=cache_key,
                    payload=payload,
                    expires_at=expires_at,
                )
            )
        session.commit()
    except Exception as exc:
        session.rollback()
        logger.debug("Não foi possível persistir cache externo: %s", exc)
    finally:
        if owns_session:
            session.close()
