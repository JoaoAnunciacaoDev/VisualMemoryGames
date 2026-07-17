from typing import Dict, List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.security import get_current_user
from app.services.game_provider import get_game_details_rawg
from app.services.recommendation_service import RecommendationService

router = APIRouter(prefix="/users/me/recommendations", tags=["Recommendations"])


@router.get("", response_model=List[Dict])
def get_recommendations(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Retorna carrosséis de recomendações baseados no perfil do usuário."""
    service = RecommendationService(db, current_user.id)
    return service.get_all_recommendations()


@router.get("/game-details/{external_id}", response_model=Dict)
def get_game_recommendation_details(
    external_id: int, current_user: User = Depends(get_current_user)
):
    """Busca detalhes estendidos (sinopse, nota, trailer)
    diretamente da RAWG para um jogo recomendado."""
    return get_game_details_rawg(external_id)
