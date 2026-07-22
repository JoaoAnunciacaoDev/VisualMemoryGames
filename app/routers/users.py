import json
import os
import random
from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import List

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.limiter import limiter
from app.models.custom_lists import CustomList
from app.models.email_verification import EmailVerification
from app.models.tierlist import TierList
from app.models.user import User
from app.models.user_game import UserGame
from app.routers.steam import ACTIVE_SYNC_USERS
from app.schemas.user import (
    DashboardGame,
    DashboardResponse,
    UserCreate,
    UserDeleteRequest,
    UserPasswordChange,
    UserRegisterInitiate,
    UserResponse,
    UserUpdate,
    UserVisibilityUpdate,
    YearlyGames,
)
from app.security import get_current_user
from app.services.auth_service import get_password_hash, verify_password
from app.services.email_service import send_verification_email

router = APIRouter(prefix="/users", tags=["Users"])


@router.post("/register/initiate", status_code=status.HTTP_200_OK)
@limiter.limit("5/minute")
def initiate_registration(
    request: Request,
    user_init: UserRegisterInitiate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    from sqlalchemy import func

    existing_user = (
        db.query(User)
        .filter(
            (func.lower(User.email) == func.lower(user_init.email))
            | (func.lower(User.username) == func.lower(user_init.username))
        )
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="E-mail ou username já cadastrado.",
        )

    # Gerar código
    if os.getenv("ENVIRONMENT") == "testing":
        code = "123456"
    else:
        code = f"{random.randint(100000, 999999)}"

    # Definir expiração para 10 minutos a partir de agora em UTC
    expires_at = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(minutes=10)

    # Gravar ou atualizar o código de verificação
    verification = (
        db.query(EmailVerification).filter(EmailVerification.email == user_init.email).first()
    )
    if verification:
        verification.code = code
        verification.expires_at = expires_at
    else:
        verification = EmailVerification(email=user_init.email, code=code, expires_at=expires_at)
        db.add(verification)

    db.commit()

    # Enviar e-mail de verificação em segundo plano
    background_tasks.add_task(send_verification_email, user_init.email, code)

    return {"message": "Código de verificação enviado para o e-mail informado."}


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    from sqlalchemy import func

    existing_user = (
        db.query(User)
        .filter(
            (func.lower(User.email) == func.lower(user.email))
            | (func.lower(User.username) == func.lower(user.username))
        )
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="E-mail ou username já cadastrado."
        )

    # 2. Validar o código de verificação no banco de dados
    verification = db.query(EmailVerification).filter(EmailVerification.email == user.email).first()

    if not verification or verification.code != user.code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Código de verificação incorreto ou inexistente.",
        )

    # Verificar se o código está expirado
    current_time = datetime.now(timezone.utc).replace(tzinfo=None)
    if verification.expires_at < current_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Código de verificação expirou.",
        )

    # 3. Remover o código usado para que não seja reutilizado
    db.delete(verification)

    # 4. Criar o usuário de fato
    hashed_password = get_password_hash(user.password)

    new_user = User(username=user.username, email=user.email, password_hash=hashed_password)

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


@router.get("/", response_model=List[UserResponse])
def read_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    users = db.query(User).offset(skip).limit(limit).all()
    return users


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    if str(db_user.id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Não tem permissão para deletar esta conta.")

    db.delete(db_user)
    db.commit()
    return None


@router.put("/me", response_model=UserResponse)
def update_me(
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    update_data = user_update.model_dump(exclude_unset=True)

    if "username" in update_data:
        existing = db.query(User).filter(User.username == update_data["username"]).first()
        if existing and str(existing.id) != str(current_user.id):
            raise HTTPException(status_code=400, detail="Username já está em uso.")
        current_user.username = update_data["username"]

    if "email" in update_data:
        existing = db.query(User).filter(User.email == update_data["email"]).first()
        if existing and str(existing.id) != str(current_user.id):
            raise HTTPException(status_code=400, detail="Email já está em uso.")
        current_user.email = update_data["email"]

    db.commit()
    db.refresh(current_user)
    return current_user


@router.patch("/me/visibility", response_model=UserResponse)
def update_visibility(
    visibility_update: UserVisibilityUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_user.is_public = visibility_update.is_public
    db.commit()
    db.refresh(current_user)
    return current_user


@router.put("/me/password", status_code=status.HTTP_200_OK)
def change_password(
    pwd_change: UserPasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Muda a senha do usuário autenticado após validar a senha atual."""
    if not verify_password(pwd_change.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Senha atual incorreta."
        )

    current_user.password_hash = get_password_hash(pwd_change.new_password)
    db.commit()
    return {"message": "Senha alterada com sucesso."}


@router.post("/me/deactivate", status_code=status.HTTP_200_OK)
def deactivate_account(
    del_req: UserDeleteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Solicita exclusão da conta (desativação temporária por 15 dias)."""
    if not verify_password(del_req.password, current_user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Senha incorreta.")

    current_user.is_deleted = True
    current_user.deleted_at = datetime.now(timezone.utc)
    db.commit()
    return {
        "message": "Conta desativada com sucesso. "
        "Você tem 15 dias para fazer login e reativar a conta."
    }


@router.get("/me/dashboard", response_model=DashboardResponse)
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Gera dados estatísticos e histórico de jogos do usuário atual para a página de perfil."""
    return get_user_dashboard(str(current_user.id), db, current_user, current_user)


@router.get("/{identifier}/dashboard", response_model=DashboardResponse)
def get_public_dashboard(
    identifier: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from sqlalchemy import func

    target_user = (
        db.query(User)
        .filter((User.id == identifier) | (func.lower(User.username) == func.lower(identifier)))
        .first()
    )
    if not target_user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    from app.models.follow import Follow

    is_following = (
        db.query(Follow)
        .filter(Follow.follower_id == current_user.id, Follow.following_id == target_user.id)
        .first()
        is not None
    )

    if (
        not target_user.is_public
        and not current_user.is_admin
        and not is_following
        and target_user.id != current_user.id
    ):
        raise HTTPException(status_code=403, detail="Perfil privado.")

    return get_user_dashboard(str(target_user.id), db, target_user, current_user)


def get_user_dashboard(user_id: str, db: Session, target_user: User, current_user: User = None):
    user_games = (
        db.query(UserGame)
        .options(joinedload(UserGame.game))
        .filter(UserGame.user_id == user_id)
        .all()
    )
    games_count = len(user_games)

    lists_count = db.query(CustomList).filter(CustomList.user_id == user_id).count()
    tierlists_count = db.query(TierList).filter(TierList.user_id == user_id).count()
    favorites_count = sum(1 for ug in user_games if ug.favorite)

    status_distribution_query = (
        db.query(UserGame.status, func.count(UserGame.id))
        .filter(UserGame.user_id == user_id)
        .group_by(UserGame.status)
        .all()
    )
    status_distribution = {status: count for status, count in status_distribution_query}

    genre_counts = Counter()
    for ug in user_games:
        if ug.game and ug.game.genres:
            genres_list = ug.game.genres if isinstance(ug.game.genres, list) else []
            if not genres_list and isinstance(ug.game.genres, str):
                try:
                    genres_list = json.loads(ug.game.genres)
                except Exception:
                    pass
            genre_counts.update(genres_list)

    genre_counts = dict(genre_counts)

    most_played_genre = None
    if genre_counts:
        most_played_genre = max(genre_counts.keys(), key=lambda g: genre_counts[g])

    has_pending_genres = str(user_id) in ACTIVE_SYNC_USERS

    yearly_dict = {}
    for ug in user_games:
        if ug.finished_at:
            year = ug.finished_at.year
            cover = ug.custom_cover_url or (ug.game.cover_url if ug.game else None)
            g_data = DashboardGame(
                title=ug.game.title if ug.game else "Jogo Desconhecido",
                cover_url=cover,
                hours_played=ug.hours_played or 0.0,
                rating=ug.rating,
                finished_at=(datetime.combine(ug.finished_at, datetime.min.time())),
            )
            if year not in yearly_dict:
                yearly_dict[year] = []
            yearly_dict[year].append(g_data)

    yearly_games_list = []
    for year in sorted(yearly_dict.keys(), reverse=True):
        sorted_games = sorted(
            yearly_dict[year],
            key=lambda x: (x.hours_played, x.rating or 0.0),
            reverse=True,
        )
        yearly_games_list.append(YearlyGames(year=year, games=sorted_games))

    platinum_dict = {}
    for ug in user_games:
        if ug.platinum_at:
            year = ug.platinum_at.year
            cover = ug.custom_cover_url or (ug.game.cover_url if ug.game else None)
            g_data = DashboardGame(
                title=ug.game.title if ug.game else "Jogo Desconhecido",
                cover_url=cover,
                hours_played=ug.hours_played or 0.0,
                rating=ug.rating,
                finished_at=(datetime.combine(ug.platinum_at, datetime.min.time())),
            )
            if year not in platinum_dict:
                platinum_dict[year] = []
            platinum_dict[year].append(g_data)

    yearly_platinums_list = []
    for year in sorted(platinum_dict.keys(), reverse=True):
        sorted_platinums = sorted(
            platinum_dict[year],
            key=lambda x: (x.hours_played, x.rating or 0.0),
            reverse=True,
        )
        yearly_platinums_list.append(YearlyGames(year=year, games=sorted_platinums))

    favorite_games_list = []
    for ug in user_games:
        if ug.favorite:
            cover = ug.custom_cover_url or (ug.game.cover_url if ug.game else None)
            g_data = DashboardGame(
                title=ug.game.title if ug.game else "Jogo Desconhecido",
                cover_url=cover,
                hours_played=ug.hours_played or 0.0,
                rating=ug.rating,
                finished_at=(
                    datetime.combine(ug.finished_at, datetime.min.time())
                    if ug.finished_at
                    else None
                ),
            )
            favorite_games_list.append(g_data)

    favorite_games_list = sorted(
        favorite_games_list,
        key=lambda x: (x.rating or 0.0, x.hours_played),
        reverse=True,
    )

    from app.models.follow import Follow

    followers_count = db.query(Follow).filter(Follow.following_id == target_user.id).count()
    following_count = db.query(Follow).filter(Follow.follower_id == target_user.id).count()

    is_following_val = False
    if current_user and current_user.id != target_user.id:
        is_following_val = (
            db.query(Follow)
            .filter(Follow.follower_id == current_user.id, Follow.following_id == target_user.id)
            .first()
            is not None
        )

    return DashboardResponse(
        username=target_user.username,
        email=target_user.email,
        created_at=target_user.created_at,
        games_count=games_count,
        lists_count=lists_count,
        tierlists_count=tierlists_count,
        favorites_count=favorites_count,
        status_distribution=status_distribution,
        most_played_genre=most_played_genre,
        genre_distribution=genre_counts,
        has_pending_genres=has_pending_genres,
        followers_count=followers_count,
        following_count=following_count,
        yearly_games=yearly_games_list,
        yearly_platinums=yearly_platinums_list,
        favorite_games=favorite_games_list,
        is_following=is_following_val,
    )
