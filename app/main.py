from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.models import user, game, user_game, tierlist, custom_list  # noqa: F401
from app.routers import auth, users, games, user_games, tierlists, custom_lists

load_dotenv()

app = FastAPI(title="GameLog API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(games.router)
app.include_router(user_games.router)
app.include_router(tierlists.router)
app.include_router(custom_lists.router)

@app.get("/")
def read_root():
    return {"message": "GameLog API rodando liso, liso!"}