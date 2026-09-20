from __future__ import annotations

import asyncio
import logging
import os
import random
import threading
import time
from email.utils import parsedate_to_datetime

import httpx

logger = logging.getLogger("visualmemory.http")

DEFAULT_TIMEOUT = httpx.Timeout(connect=5.0, read=15.0, write=10.0, pool=5.0)
DEFAULT_LIMITS = httpx.Limits(max_connections=10, max_keepalive_connections=5, keepalive_expiry=30)
DEFAULT_HEADERS = {"User-Agent": "VisualMemory/1.0 (+https://visualmemory.app)"}
TRANSIENT_STATUS_CODES = {429, 502, 503, 504}

_async_client: httpx.AsyncClient | None = None
_sync_client: httpx.Client | None = None
_sync_lock = threading.Lock()


def _retry_delay(response: httpx.Response | None, attempt: int) -> float:
    if response is not None:
        value = response.headers.get("Retry-After")
        if value:
            try:
                return min(30.0, max(0.0, float(value)))
            except ValueError:
                try:
                    return min(
                        30.0,
                        max(0.0, parsedate_to_datetime(value).timestamp() - time.time()),
                    )
                except (TypeError, ValueError, OverflowError):
                    pass
    return min(8.0, (0.4 * (2**attempt)) + random.uniform(0, 0.2))


def get_async_client() -> httpx.AsyncClient:
    global _async_client
    if _async_client is None or _async_client.is_closed:
        _async_client = httpx.AsyncClient(
            timeout=DEFAULT_TIMEOUT,
            limits=DEFAULT_LIMITS,
            headers=DEFAULT_HEADERS,
            follow_redirects=True,
        )
    return _async_client


def get_sync_client() -> httpx.Client:
    global _sync_client
    if _sync_client is None or _sync_client.is_closed:
        with _sync_lock:
            if _sync_client is None or _sync_client.is_closed:
                _sync_client = httpx.Client(
                    timeout=DEFAULT_TIMEOUT,
                    limits=DEFAULT_LIMITS,
                    headers=DEFAULT_HEADERS,
                    follow_redirects=True,
                )
    return _sync_client


async def request_async(
    method: str, url: str, *, client: httpx.AsyncClient | None = None, **kwargs
) -> httpx.Response:
    attempts = max(1, int(os.getenv("HTTP_MAX_ATTEMPTS", "3")))
    response = None
    for attempt in range(attempts):
        try:
            response = await (client or get_async_client()).request(method, url, **kwargs)
            if response.status_code not in TRANSIENT_STATUS_CODES or attempt == attempts - 1:
                return response
        except (httpx.TimeoutException, httpx.NetworkError):
            if attempt == attempts - 1:
                raise
        await asyncio.sleep(_retry_delay(response, attempt))
    raise RuntimeError("HTTP retry loop terminou sem resposta")


def request_sync(method: str, url: str, **kwargs) -> httpx.Response:
    attempts = max(1, int(os.getenv("HTTP_MAX_ATTEMPTS", "3")))
    response = None
    for attempt in range(attempts):
        try:
            response = get_sync_client().request(method, url, **kwargs)
            if response.status_code not in TRANSIENT_STATUS_CODES or attempt == attempts - 1:
                return response
        except (httpx.TimeoutException, httpx.NetworkError):
            if attempt == attempts - 1:
                raise
        time.sleep(_retry_delay(response, attempt))
    raise RuntimeError("HTTP retry loop terminou sem resposta")


async def close_http_clients() -> None:
    global _async_client, _sync_client
    if _async_client is not None and not _async_client.is_closed:
        await _async_client.aclose()
    if _sync_client is not None and not _sync_client.is_closed:
        _sync_client.close()
    _async_client = None
    _sync_client = None
