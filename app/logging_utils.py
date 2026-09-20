import json
import logging
import os
import re
from datetime import datetime, timezone
from urllib.parse import urlsplit

_SENSITIVE_PATTERNS = (
    re.compile(r"(?i)(bearer\s+)[a-z0-9._~+\-/]+=*"),
    re.compile(r"(?i)([?&](?:api[_-]?key|access[_-]?token|token|password|secret)=)[^&\s]+"),
    re.compile(r"(?i)((?:api[_-]?key|access[_-]?token|token|password|secret)\s*[=:]\s*)[^,;&\s]+"),
    re.compile(r"(?i)((?:c[oó]digo)\s*[=:]\s*)\d{6}"),
    re.compile(r"(?i)([a-z][a-z0-9+.-]*://[^:/\s]+:)[^@/\s]+(@)"),
)


def redact_sensitive(value: object) -> str:
    text = str(value)
    for pattern in _SENSITIVE_PATTERNS:
        text = pattern.sub(r"\1[REDACTED]\2" if pattern.groups >= 2 else r"\1[REDACTED]", text)
    return text


def safe_database_target(database_url: str) -> str:
    """Retorna apenas host, porta e banco, sem usuário, senha ou parâmetros."""
    try:
        parsed = urlsplit(database_url)
        host = parsed.hostname or "unknown-host"
        port = f":{parsed.port}" if parsed.port else ""
        database = parsed.path.lstrip("/") or "unknown-database"
        return f"{host}{port}/{database}"
    except (TypeError, ValueError):
        return "configured-database"


class SensitiveDataFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.msg = redact_sensitive(record.msg)
        if isinstance(record.args, tuple):
            record.args = tuple(
                redact_sensitive(value) if isinstance(value, str) else value
                for value in record.args
            )
        elif isinstance(record.args, dict):
            record.args = {
                key: redact_sensitive(value) if isinstance(value, str) else value
                for key, value in record.args.items()
            }
        return True


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        for key in ("request_id", "method", "path", "status_code", "duration_ms", "job_type"):
            value = getattr(record, key, None)
            if value is not None:
                payload[key] = value
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False)


def configure_safe_logging() -> None:
    """Adiciona sanitização aos handlers já configurados pelo servidor."""
    sensitive_filter = SensitiveDataFilter()
    loggers = [logging.getLogger()]
    loggers.extend(
        logging.getLogger(name) for name in ("uvicorn", "uvicorn.error", "uvicorn.access")
    )

    seen_handlers: set[int] = set()
    use_json = os.getenv("LOG_FORMAT", "").lower() == "json" or bool(os.getenv("RENDER"))
    for logger in loggers:
        for handler in logger.handlers:
            if id(handler) not in seen_handlers:
                handler.addFilter(sensitive_filter)
                if use_json:
                    handler.setFormatter(JsonFormatter())
                seen_handlers.add(id(handler))
