from __future__ import annotations

import threading
from collections import defaultdict
from time import perf_counter


class ApplicationMetrics:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._started_at = perf_counter()
        self._requests = 0
        self._errors = 0
        self._duration_ms = 0.0
        self._by_status: dict[str, int] = defaultdict(int)

    def observe_request(self, status_code: int, duration_ms: float) -> None:
        with self._lock:
            self._requests += 1
            self._errors += int(status_code >= 500)
            self._duration_ms += duration_ms
            self._by_status[str(status_code)] += 1

    def snapshot(self) -> dict:
        with self._lock:
            average = self._duration_ms / self._requests if self._requests else 0.0
            return {
                "uptime_seconds": round(perf_counter() - self._started_at, 1),
                "requests_total": self._requests,
                "server_errors_total": self._errors,
                "request_duration_average_ms": round(average, 2),
                "responses_by_status": dict(self._by_status),
            }


metrics = ApplicationMetrics()
