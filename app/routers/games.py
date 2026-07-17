import json
from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.game import Game
from app.models.user import User
from app.schemas.game import GameBase, GameCreate, GameResponse
from app.security import get_current_user
from app.services.game_provider import search_games_on_rawg
from app.services.storage import save_upload_file

router = APIRouter(prefix="/games", tags=["Games"])


@router.get("/search", response_model=List[GameBase])
def search_external_games(q: str):
    """Busca jogos na API externa da RAWG pelo nome."""
    if not q or len(q) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A busca deve ter pelo menos 3 caracteres.",
        )
    return search_games_on_rawg(q)


@router.post("/", response_model=GameResponse, status_code=status.HTTP_201_CREATED)
def create_game(
    game: GameCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    if game.external_id:
        existing_game = db.query(Game).filter(Game.external_id == game.external_id).first()
        if existing_game:
            return existing_game

    new_game = Game(
        external_id=game.external_id,
        title=game.title,
        cover_url=game.cover_url,
        release_year=game.release_year,
        platforms=game.platforms,
        genres=game.genres,
        is_manual=False,
    )

    db.add(new_game)
    db.commit()
    db.refresh(new_game)
    return new_game


@router.get("/", response_model=List[GameResponse])
def read_games(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista todos os jogos do catálogo (apenas autenticados)."""
    games = db.query(Game).offset(skip).limit(limit).all()
    return games


@router.post("/manual", response_model=GameResponse, status_code=status.HTTP_201_CREATED)
async def create_manual_game(
    title: str = Form(...),
    release_year: Optional[int] = Form(None),
    platforms: str = Form("[]"),
    genres: str = Form("[]"),
    cover_url: Optional[str] = Form(None),
    cover_file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cria um jogo manualmente sem vínculo com a RAWG."""

    if not title.strip():
        raise HTTPException(status_code=400, detail="O título do jogo não pode estar vazio")
    if release_year is not None:
        current_year = date.today().year
        if release_year > current_year + 2:
            raise HTTPException(
                status_code=400,
                detail=f"Ano de lançamento não pode ser superior a {current_year + 2}",
            )

    final_cover_url = cover_url

    if cover_file and cover_file.filename:
        final_cover_url = await save_upload_file(cover_file)

    new_game = Game(
        external_id=None,
        title=title.strip(),
        cover_url=final_cover_url,
        release_year=release_year,
        platforms=json.loads(platforms),
        genres=json.loads(genres),
        is_manual=True,
        created_by=str(current_user.id),
    )

    db.add(new_game)
    db.commit()
    db.refresh(new_game)
    return new_game


@router.get("/manual/user/{user_id}", response_model=List[GameResponse])
def get_user_manual_games(
    user_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """Retorna os jogos criados manualmente por um usuário. Apenas o próprio dono."""
    if str(user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Sem permissão para ver estes jogos.")
    games = db.query(Game).filter(Game.is_manual, Game.created_by == user_id).all()
    return games


@router.put("/manual/{game_id}", response_model=GameResponse)
async def update_manual_game(
    game_id: str,
    title: str = Form(...),
    release_year: Optional[int] = Form(None),
    platforms: str = Form("[]"),
    genres: str = Form("[]"),
    cover_url: Optional[str] = Form(None),
    cover_file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Jogo não encontrado.")
    if str(game.created_by) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Sem permissão.")
    if not bool(game.is_manual):
        raise HTTPException(
            status_code=400, detail="Este jogo não é manual e não pode ser editado aqui."
        )

    if not title.strip():
        raise HTTPException(status_code=400, detail="O título do jogo não pode estar vazio")
    if release_year is not None:
        current_year = date.today().year
        if release_year > current_year + 2:
            raise HTTPException(
                status_code=400,
                detail=f"Ano de lançamento não pode ser superior a {current_year + 2}",
            )

    final_cover_url = cover_url
    if cover_file and cover_file.filename:
        final_cover_url = await save_upload_file(cover_file)

    game.title = title.strip()
    game.release_year = release_year
    game.platforms = json.loads(platforms)
    game.genres = json.loads(genres)
    if final_cover_url:
        game.cover_url = final_cover_url

    db.commit()
    db.refresh(game)
    return game


@router.delete("/manual/{game_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_manual_game(
    game_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Jogo não encontrado.")
    if str(game.created_by) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Sem permissão.")
    if not bool(game.is_manual):
        raise HTTPException(
            status_code=400, detail="Este jogo não é manual e não pode ser eliminado aqui."
        )

    db.delete(game)
    db.commit()
    return None
