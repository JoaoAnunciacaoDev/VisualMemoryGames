import json
from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.game import Game
from app.models.user import User
from app.schemas.game import GameBase, GameCreate, GameResponse
from app.security import get_current_user
from app.services.game_identity import (
    attach_provider_id,
    find_game_by_provider_id,
    normalize_game_provider,
)
from app.services.game_provider import search_games_on_rawg
from app.services.storage import delete_stored_file, delete_stored_file_async, save_upload_file

router = APIRouter(prefix="/games", tags=["Games"])


def _game_response(
    game: Game, source: str | None = None, external_id: int | None = None
) -> GameResponse:
    response = GameResponse.model_validate(game)
    if source:
        return response.model_copy(update={"source": source, "external_id": external_id})
    return response


def _enrich_game(existing_game: Game, game: GameCreate) -> None:
    if game.cover_url and not existing_game.cover_url:
        existing_game.cover_url = game.cover_url
    if game.release_year and not existing_game.release_year:
        existing_game.release_year = game.release_year
    if game.platforms and not existing_game.platforms:
        existing_game.platforms = game.platforms
    if game.genres and not existing_game.genres:
        existing_game.genres = game.genres


@router.get("/search", response_model=List[GameBase])
def search_external_games(q: str, page: int = 1, db: Session = Depends(get_db)):
    """Busca jogos por nome (Cache local -> IGDB -> RAWG) com paginação."""
    if not q or len(q) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A busca deve ter pelo menos 3 caracteres.",
        )
    return search_games_on_rawg(q, db=db, page=page)


@router.post("/", response_model=GameResponse, status_code=status.HTTP_201_CREATED)
def create_game(
    game: GameCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    clean_title = game.title.strip()
    provider = normalize_game_provider(game.source)

    # IDs externos só são únicos dentro do provedor. O vínculo com namespace é
    # autoritativo e evita tratar um ID IGDB como se fosse o mesmo ID da RAWG.
    provider_game = find_game_by_provider_id(db, provider, game.external_id)
    if provider_game:
        _enrich_game(provider_game, game)
        db.commit()
        db.refresh(provider_game)
        return _game_response(provider_game, provider, game.external_id)

    # 1. Verifica se já existe o jogo por título exato (case-insensitive)
    existing_game = db.query(Game).filter(func.lower(Game.title) == clean_title.lower()).first()
    if existing_game:
        if game.external_id and not existing_game.external_id:
            conflict = db.query(Game).filter(Game.external_id == game.external_id).first()
            if not conflict:
                existing_game.external_id = game.external_id
        _enrich_game(existing_game, game)
        owner = attach_provider_id(db, existing_game, provider, game.external_id)
        if owner.id != existing_game.id:
            _enrich_game(owner, game)
            existing_game = owner
        db.commit()
        db.refresh(existing_game)
        return _game_response(existing_game, provider, game.external_id)

    # 2. Se não encontrou pelo título, verifica por external_id MAS garante que o título seja igual
    target_external_id = game.external_id
    if game.external_id:
        existing_by_ext = db.query(Game).filter(Game.external_id == game.external_id).first()
        if existing_by_ext:
            if existing_by_ext.title.strip().lower() == clean_title.lower():
                return existing_by_ext
            else:
                # Conflito de ID entre provedores diferentes com títulos diferentes
                target_external_id = None

    new_game = Game(
        external_id=target_external_id,
        title=clean_title,
        cover_url=game.cover_url,
        release_year=game.release_year,
        platforms=game.platforms,
        genres=game.genres,
        is_manual=False,
    )

    db.add(new_game)
    db.flush()
    owner = attach_provider_id(db, new_game, provider, game.external_id)
    if owner.id != new_game.id:
        db.rollback()
        _enrich_game(owner, game)
        db.commit()
        db.refresh(owner)
        return _game_response(owner, provider, game.external_id)
    db.commit()
    db.refresh(new_game)
    return _game_response(new_game, provider, game.external_id)


@router.get("/", response_model=List[GameResponse])
def read_games(
    skip: int = Query(0, ge=0),
    offset: Optional[int] = Query(None, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista todos os jogos do catálogo (apenas autenticados)."""
    games = db.query(Game).offset(offset if offset is not None else skip).limit(limit).all()
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

    parsed_platforms = json.loads(platforms)
    parsed_genres = json.loads(genres)
    final_cover_url = cover_url

    uploaded_cover_url = None
    if cover_file and cover_file.filename:
        uploaded_cover_url = await save_upload_file(cover_file)
        final_cover_url = uploaded_cover_url

    new_game = Game(
        external_id=None,
        title=title.strip(),
        cover_url=final_cover_url,
        release_year=release_year,
        platforms=parsed_platforms,
        genres=parsed_genres,
        is_manual=True,
        created_by=str(current_user.id),
    )

    try:
        db.add(new_game)
        db.commit()
    except Exception:
        db.rollback()
        await delete_stored_file_async(uploaded_cover_url)
        raise
    db.refresh(new_game)
    return new_game


@router.get("/manual/user/{user_id}", response_model=List[GameResponse])
def get_user_manual_games(
    user_id: str,
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna os jogos criados manualmente por um usuário. Apenas o próprio dono."""
    if str(user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Sem permissão para ver estes jogos.")
    games = (
        db.query(Game)
        .filter(Game.is_manual, Game.created_by == user_id)
        .order_by(Game.id)
        .offset(offset)
        .limit(limit)
        .all()
    )
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

    previous_cover_url = game.cover_url
    parsed_platforms = json.loads(platforms)
    parsed_genres = json.loads(genres)
    final_cover_url = cover_url
    uploaded_cover_url = None
    if cover_file and cover_file.filename:
        uploaded_cover_url = await save_upload_file(cover_file)
        final_cover_url = uploaded_cover_url

    game.title = title.strip()
    game.release_year = release_year
    game.platforms = parsed_platforms
    game.genres = parsed_genres
    if final_cover_url:
        game.cover_url = final_cover_url

    try:
        db.commit()
    except Exception:
        db.rollback()
        await delete_stored_file_async(uploaded_cover_url)
        raise
    db.refresh(game)
    if final_cover_url and final_cover_url != previous_cover_url:
        await delete_stored_file_async(previous_cover_url)
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

    cover_to_delete = game.cover_url
    db.delete(game)
    db.commit()
    delete_stored_file(cover_to_delete)
    return None
