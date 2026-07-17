from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.social import FeedResponse, UserPublicProfile
from app.security import get_current_user
from app.services import social_service

router = APIRouter(prefix="/social", tags=["Social"])


@router.get("/feed", response_model=FeedResponse)
def get_my_feed(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna as atividades dos usuários seguidos e lançamentos da semana."""
    return social_service.get_feed(current_user, db)


@router.get("/users/search", response_model=List[UserPublicProfile])
def search_users(
    q: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Pesquisa por perfis públicos pelo username."""
    if not q or len(q) < 2:
        return []
    return social_service.search_users(q, current_user, db)


@router.get("/users/{user_id}/profile", response_model=UserPublicProfile)
def get_profile(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Busca o perfil social de um usuário específico."""
    profile = social_service.get_user_profile(user_id, current_user, db)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Perfil privado ou não encontrado."
        )
    return profile


@router.get("/users/{user_id}/followers", response_model=List[UserPublicProfile])
def get_followers(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Busca a lista de seguidores de um usuário."""
    target_id = str(current_user.id) if user_id == "me" else user_id
    print(f"[DEBUG] get_followers user_id={user_id}, target_id={target_id}")
    followers = social_service.get_followers(target_id, current_user, db)
    print(f"[DEBUG] get_followers returning {len(followers)} followers")
    return followers


@router.get("/users/{user_id}/following", response_model=List[UserPublicProfile])
def get_following(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Busca a lista de quem um usuário segue."""
    target_id = str(current_user.id) if user_id == "me" else user_id
    following = social_service.get_following(target_id, current_user, db)
    return following


@router.post("/users/{user_id}/follow", status_code=status.HTTP_204_NO_CONTENT)
def follow_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Segue um usuário público."""
    success = social_service.follow_user(user_id, current_user, db)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Não é possível seguir este usuário."
        )


@router.delete("/users/{user_id}/follow", status_code=status.HTTP_204_NO_CONTENT)
def unfollow_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Deixa de seguir um usuário."""
    social_service.unfollow_user(user_id, current_user, db)
