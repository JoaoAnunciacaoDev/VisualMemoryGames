import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database import SessionLocal
from app.limiter import limiter
from app.models import custom_lists, game, tierlist, user, user_game  # noqa: F401
from app.routers import (
    admin,
    auth,
    custom_lists,  # noqa: F811
    games,
    steam,
    tierlists,
    user_games,
    users,
)  # noqa: F811
from app.routers.auth import cleanup_deleted_users

load_dotenv()

app = FastAPI(title="VisualMemory API")
app.state.limiter = limiter

allowed_origins_str = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
origins = [origin.strip() for origin in allowed_origins_str.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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
app.include_router(admin.router)


@app.on_event("startup")
def on_startup():
    db = SessionLocal()
    try:
        cleanup_deleted_users(db)
    except Exception:
        pass
    finally:
        db.close()


@app.get("/")
def read_root():
    return {"message": "VisualMemory API rodando liso, liso!"}
