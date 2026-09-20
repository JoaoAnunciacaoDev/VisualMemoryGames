# ruff: noqa: E402
import logging
import os
import re
import secrets
import time
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from urllib.parse import urlsplit

from dotenv import load_dotenv

load_dotenv()

from app.config import validate_runtime_configuration
from app.logging_utils import configure_safe_logging

validate_runtime_configuration()
configure_safe_logging()

from fastapi import Depends, FastAPI, Header, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app.database import SessionLocal, get_db
from app.limiter import limiter
from app.models import custom_lists, game, itch_account, tierlist, user, user_game  # noqa: F401
from app.models.sync_job import SyncJob
from app.routers import (
    admin,
    auth,
    custom_lists,  # noqa: F811
    epic,
    games,
    gog,
    itch,
    jobs,
    patch_notes,
    recommendation,
    social,
    steam,
    tierlists,
    user_games,
    users,
)  # noqa: F811
from app.routers.auth import cleanup_deleted_users
from app.services.external_cache import prune_expired_cache
from app.services.http_client import close_http_clients, get_async_client, get_sync_client
from app.services.job_service import start_worker, stop_worker
from app.services.observability import metrics
from app.services.secret_storage import encrypt_legacy_itch_tokens

logger = logging.getLogger("visualmemory.api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    if os.getenv("ENVIRONMENT", "development").lower() != "testing":
        db = SessionLocal()
        try:
            cleanup_deleted_users(db)
            encrypt_legacy_itch_tokens(db)
            prune_expired_cache(db=db)
        except Exception:
            logger.exception("Falha na manutenção inicial da aplicação.")
        finally:
            db.close()
    start_worker()
    get_async_client()
    get_sync_client()
    try:
        yield
    finally:
        await stop_worker()
        await close_http_clients()


app = FastAPI(title="VisualMemory API", lifespan=lifespan)
app.state.limiter = limiter


def _request_origin_is_allowed(request: Request) -> bool:
    origin = request.headers.get("origin")
    if not origin:
        referer = request.headers.get("referer", "")
        parsed = urlsplit(referer)
        origin = f"{parsed.scheme}://{parsed.netloc}" if parsed.scheme and parsed.netloc else ""
    if not origin:
        return False
    forwarded_scheme = request.headers.get("x-forwarded-proto", request.url.scheme)
    same_origin = f"{forwarded_scheme}://{request.headers.get('host', request.url.netloc)}"
    return origin == same_origin or origin in origins or bool(
        origins_regex and re.fullmatch(origins_regex, origin)
    )


@app.middleware("http")
async def csrf_origin_protection(request: Request, call_next):
    unsafe_method = request.method not in {"GET", "HEAD", "OPTIONS", "TRACE"}
    uses_cookie_auth = bool(request.cookies.get("token"))
    if (
        os.getenv("ENVIRONMENT", "development").lower() == "production"
        and unsafe_method
        and uses_cookie_auth
        and not _request_origin_is_allowed(request)
    ):
        return JSONResponse(status_code=403, content={"detail": "Origem da requisição inválida."})
    return await call_next(request)


@app.middleware("http")
async def request_observability(request: Request, call_next):
    supplied_id = request.headers.get("X-Request-ID", "")
    request_id = (
        supplied_id[:100] if supplied_id.isascii() and supplied_id.strip() else str(uuid.uuid4())
    )
    started_at = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        duration_ms = (time.perf_counter() - started_at) * 1000
        metrics.observe_request(500, duration_ms)
        logger.exception(
            "request_failed",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": 500,
                "duration_ms": round(duration_ms, 2),
            },
        )
        raise
    duration_ms = (time.perf_counter() - started_at) * 1000
    metrics.observe_request(response.status_code, duration_ms)
    response.headers["X-Request-ID"] = request_id
    logger.info(
        "request_completed",
        extra={
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "duration_ms": round(duration_ms, 2),
        },
    )
    return response


allowed_origins_str = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
origins = [origin.strip() for origin in allowed_origins_str.split(",") if origin.strip()]
default_origins_regex = (
    "" if os.getenv("ENVIRONMENT", "development").lower() == "production"
    else r"https://visual-memory-games.*\.vercel\.app"
)
origins_regex = os.getenv("ALLOWED_ORIGINS_REGEX", default_origins_regex).strip() or None

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=origins_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Path("uploads/covers").mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(games.router)
app.include_router(user_games.router)
app.include_router(tierlists.router)
app.include_router(custom_lists.router)
app.include_router(steam.router)
app.include_router(gog.router)
app.include_router(itch.router)
app.include_router(epic.router)
app.include_router(admin.router)
app.include_router(recommendation.router)
app.include_router(social.router)
app.include_router(patch_notes.router)
app.include_router(jobs.router)


@app.get("/")
def read_root():
    return {"message": "VisualMemory API rodando liso, liso!"}


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/ready")
def readiness_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
    except Exception as exc:
        logger.warning("readiness_failed", exc_info=exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Banco de dados indisponível.",
        ) from exc
    return {"status": "ready"}


@app.get("/internal/metrics", include_in_schema=False)
def internal_metrics(
    x_cron_secret: str | None = Header(default=None), db: Session = Depends(get_db)
):
    configured = os.getenv("INTERNAL_CRON_SECRET", "")
    if not configured or not x_cron_secret or not secrets.compare_digest(configured, x_cron_secret):
        raise HTTPException(status_code=401, detail="Credencial interna inválida.")
    snapshot = metrics.snapshot()
    snapshot["jobs_by_status"] = dict(
        db.query(SyncJob.status, func.count(SyncJob.id)).group_by(SyncJob.status).all()
    )
    return snapshot
