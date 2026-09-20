import os
import secrets
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.sync_job import SyncJob
from app.models.user import User
from app.schemas.jobs import SyncJobResponse
from app.security import get_current_user
from app.services.job_service import wake_worker

router = APIRouter(tags=["Background Jobs"])


@router.get("/users/me/jobs", response_model=list[SyncJobResponse])
def list_my_jobs(
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(SyncJob)
        .filter(SyncJob.user_id == current_user.id)
        .order_by(SyncJob.created_at.desc())
        .limit(limit)
        .all()
    )


@router.get("/users/me/jobs/{job_id}", response_model=SyncJobResponse)
def get_my_job(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    job = db.query(SyncJob).filter(SyncJob.id == job_id, SyncJob.user_id == current_user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job não encontrado.")
    return job


@router.post("/internal/jobs/process", include_in_schema=False)
def trigger_job_worker(
    x_cron_secret: Annotated[str | None, Header()] = None,
):
    configured_secret = os.getenv("INTERNAL_CRON_SECRET", "")
    if (
        not configured_secret
        or not x_cron_secret
        or not secrets.compare_digest(configured_secret, x_cron_secret)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credencial interna inválida.",
        )
    wake_worker()
    return {"status": "accepted"}
