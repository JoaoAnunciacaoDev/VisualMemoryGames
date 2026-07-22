import os
import random
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database import get_db
from app.limiter import limiter
from app.models.password_reset import PasswordReset
from app.models.user import User
from app.schemas.password_reset import PasswordResetConfirm, PasswordResetInitiate
from app.security import create_access_token
from app.services.auth_service import get_password_hash, verify_password
from app.services.email_service import send_password_reset_email

router = APIRouter(tags=["Auth"])


def cleanup_deleted_users(db: Session):
    """Exclui permanentemente contas marcadas como is_deleted há mais de 15 dias."""
    limit_date = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=15)
    expired_users = db.query(User).filter(User.is_deleted, User.deleted_at < limit_date).all()
    for u in expired_users:
        db.delete(u)
    if expired_users:
        db.commit()


@router.post("/login")
@limiter.limit("5/minute")
def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """Rota para autenticar o usuário e gerar o Token JWT."""

    from sqlalchemy import func

    user = (
        db.query(User)
        .filter(
            (func.lower(User.username) == func.lower(form_data.username))
            | (func.lower(User.email) == func.lower(form_data.username))
        )
        .first()
    )

    if not user or not verify_password(form_data.password, str(user.password_hash)):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Trata reativação de conta dentro dos 15 dias
    if user.is_deleted:
        user.is_deleted = False
        user.deleted_at = None
        db.commit()
        db.refresh(user)

    access_token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/password-reset/initiate", status_code=status.HTTP_200_OK)
@limiter.limit("5/minute")
def initiate_password_reset(
    request: Request,
    init_data: PasswordResetInitiate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Inicia o fluxo de redefinição de senha, enviando um código de 6 dígitos."""
    user = db.query(User).filter(User.email == init_data.email).first()

    # Se o usuário não existir, retornamos sucesso genérico por segurança (evita enumeração)
    if not user:
        return {"message": "Se o e-mail estiver cadastrado, um código de redefinição foi enviado."}

    # Gerar código de 6 dígitos
    if os.getenv("ENVIRONMENT") == "testing":
        code = "654321"
    else:
        code = f"{random.randint(100000, 999999)}"

    # Expiração de 10 minutos
    expires_at = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(minutes=10)

    # Gravar ou atualizar na tabela
    pwd_reset = db.query(PasswordReset).filter(PasswordReset.email == init_data.email).first()
    if pwd_reset:
        pwd_reset.code = code
        pwd_reset.expires_at = expires_at
    else:
        pwd_reset = PasswordReset(email=init_data.email, code=code, expires_at=expires_at)
        db.add(pwd_reset)

    db.commit()

    # Enviar e-mail em segundo plano
    background_tasks.add_task(send_password_reset_email, init_data.email, code)

    return {"message": "Se o e-mail estiver cadastrado, um código de redefinição foi enviado."}


@router.post("/password-reset/confirm", status_code=status.HTTP_200_OK)
@limiter.limit("5/minute")
def confirm_password_reset(
    request: Request,
    confirm_data: PasswordResetConfirm,
    db: Session = Depends(get_db),
):
    """Valida o código de redefinição e altera a senha do usuário."""
    # 1. Validar o código no banco
    pwd_reset = db.query(PasswordReset).filter(PasswordReset.email == confirm_data.email).first()

    if not pwd_reset or pwd_reset.code != confirm_data.code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Código de redefinição incorreto ou inexistente.",
        )

    # Verificar expiração
    current_time = datetime.now(timezone.utc).replace(tzinfo=None)
    if pwd_reset.expires_at < current_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Código de redefinição expirou.",
        )

    # 2. Buscar o usuário
    user = db.query(User).filter(User.email == confirm_data.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado.",
        )

    # 3. Atualizar a senha
    hashed_password = get_password_hash(confirm_data.new_password)
    user.password_hash = hashed_password

    # 4. Limpar o código usado
    db.delete(pwd_reset)

    db.commit()

    return {"message": "Senha redefinida com sucesso."}
