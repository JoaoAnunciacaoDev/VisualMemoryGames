from datetime import datetime
from typing import Any

from pydantic import BaseModel


class SyncJobResponse(BaseModel):
    id: str
    job_type: str
    status: str
    progress: int
    attempts: int
    max_attempts: int
    result: dict[str, Any] | None = None
    created_at: datetime
    updated_at: datetime
    finished_at: datetime | None = None
    last_error: str | None = None

    model_config = {"from_attributes": True}
