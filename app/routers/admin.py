from datetime import datetime, timezone
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.user import UserResponse
from app.security import get_current_admin

router = APIRouter(prefix="/admin", tags=["Administration"])


@router.get("/stats", response_model=Dict[str, int])
def get_system_stats(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Retorna estatísticas rápidas do sistema para o painel de administração."""
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_deleted.is_(False)).count()
    inactive_users = db.query(User).filter(User.is_deleted.is_(True)).count()
    admin_users = db.query(User).filter(User.is_admin.is_(True)).count()

    return {
        "total_users": total_users,
        "active_users": active_users,
        "inactive_users": inactive_users,
        "admin_users": admin_users,
    }


@router.get("/users", response_model=List[UserResponse])
def get_all_users(
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = Query(None, description="Busca por username ou email"),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Lista todos os usuários com suporte a paginação e busca textual."""
    query = db.query(User)

    if search:
        search_filter = f"%{search}%"
        query = query.filter((User.username.like(search_filter)) | (User.email.like(search_filter)))

    # Ordenar por data de criação decrescente (mais novos primeiro)
    users = query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()
    return users


@router.post("/users/{user_id}/toggle-active", response_model=UserResponse)
def toggle_user_active(
    user_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Inverte o status de ativação/desativação (soft delete) de um usuário."""
    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Você não pode desativar sua própria conta de administrador.",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado.")

    user.is_deleted = not user.is_deleted
    user.deleted_at = datetime.now(timezone.utc).replace(tzinfo=None) if user.is_deleted else None

    db.commit()
    db.refresh(user)
    return user


@router.post("/users/{user_id}/toggle-admin", response_model=UserResponse)
def toggle_user_admin(
    user_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Inverte o privilégio de administrador de um usuário."""
    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Você não pode revogar seus próprios privilégios de administrador.",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado.")

    user.is_admin = not user.is_admin
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def hard_delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Exclui permanentemente um usuário e todos os seus dados vinculados."""
    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Você não pode excluir permanentemente seu próprio usuário ativo.",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado.")

    db.delete(user)
    db.commit()
    return None
