import json
import os
import random
from datetime import datetime, timedelta, timezone
from typing import List

import bcrypt
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.custom_lists import CustomList
from app.models.email_verification import EmailVerification
from app.models.tierlist import TierList
from app.models.user import User
from app.models.user_game import UserGame
from app.schemas.user import (
    DashboardGame,
    DashboardResponse,
    UserCreate,
    UserDeleteRequest,
    UserPasswordChange,
    UserRegisterInitiate,
    UserResponse,
    UserUpdate,
    YearlyGames,
)
from app.security import get_current_user
from app.services.auth_service import get_password_hash
from app.services.email_service import send_verification_email

router = APIRouter(prefix="/users", tags=["Users"])


@router.post("/register/initiate", status_code=status.HTTP_200_OK)
def initiate_registration(
    user_init: UserRegisterInitiate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    # Verificar se já existe usuário cadastrado
    existing_user = (
        db.query(User)
        .filter((User.email == user_init.email) | (User.username == user_init.username))
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
    # 1. Verificar se já existe usuário cadastrado
    existing_user = (
        db.query(User).filter((User.email == user.email) | (User.username == user.username)).first()
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


@router.put("/me/password", status_code=status.HTTP_200_OK)
def change_password(
    pwd_change: UserPasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Muda a senha do usuário autenticado após validar a senha atual."""
    if not bcrypt.checkpw(
        pwd_change.current_password.encode("utf-8"), current_user.password_hash.encode("utf-8")
    ):
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
    if not bcrypt.checkpw(
        del_req.password.encode("utf-8"), current_user.password_hash.encode("utf-8")
    ):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Senha incorreta.")

    current_user.is_deleted = True
    current_user.deleted_at = datetime.utcnow()
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
    user_games = db.query(UserGame).filter(UserGame.user_id == current_user.id).all()
    games_count = len(user_games)

    lists_count = db.query(CustomList).filter(CustomList.user_id == current_user.id).count()
    tierlists_count = db.query(TierList).filter(TierList.user_id == current_user.id).count()

    status_distribution = {}
    for ug in user_games:
        status_distribution[ug.status] = status_distribution.get(ug.status, 0) + 1

    genre_counts = {}
    for ug in user_games:
        if ug.game and ug.game.genres:
            try:
                genres_list = json.loads(ug.game.genres)
                for g in genres_list:
                    genre_counts[g] = genre_counts.get(g, 0) + 1
            except Exception:
                pass

    most_played_genre = None
    if genre_counts:
        most_played_genre = max(genre_counts, key=genre_counts.get)

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
                finished_at=(
                    datetime.combine(ug.finished_at, datetime.min.time())
                    if ug.finished_at
                    else None
                ),
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
        )[:5]
        yearly_games_list.append(YearlyGames(year=year, games=sorted_games))

    return DashboardResponse(
        username=current_user.username,
        email=current_user.email,
        created_at=current_user.created_at,
        games_count=games_count,
        lists_count=lists_count,
        tierlists_count=tierlists_count,
        status_distribution=status_distribution,
        most_played_genre=most_played_genre,
        yearly_games=yearly_games_list,
    )
