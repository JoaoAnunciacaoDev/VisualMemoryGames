import json

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.models.game import Game
from app.schemas.game import GameCreate, GameResponse, GameBase
from app.database import get_db
from app.services.game_provider import search_games_on_rawg


router = APIRouter(prefix="/games", tags=["Games"])


@router.get("/search", response_model=List[GameBase])
def search_external_games(q: str):
    """Busca jogos na API externa da RAWG pelo nome."""
    
    if not q or len(q) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="A busca deve ter pelo menos 3 caracteres."
        )
    
    results = search_games_on_rawg(q)
    return results


@router.post("/", response_model=GameResponse, status_code=status.HTTP_201_CREATED)
def create_game(game: GameCreate, db: Session = Depends(get_db)):
    existing_game = db.query(Game).filter(Game.external_id == game.external_id).first()
    
    if existing_game:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Este jogo já está catalogado no nosso banco de dados."
        )

    new_game = Game(
        external_id=game.external_id,
        title=game.title,
        cover_url=game.cover_url,
        release_year=game.release_year,
        platforms=json.dumps(game.platforms),
        genres=json.dumps(game.genres),
    )

    db.add(new_game)
    db.commit()
    db.refresh(new_game)

    return new_game


@router.get("/", response_model=List[GameResponse])
def read_games(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    games = db.query(Game).offset(skip).limit(limit).all()
    return games