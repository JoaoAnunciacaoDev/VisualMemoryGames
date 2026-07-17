from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.game import Game
from app.models.itch_account import ItchAccount
from app.models.user import User
from app.models.user_game import UserGame
from app.security import get_current_user
from app.services.custom_list_service import cleanup_empty_auto_lists
from app.services.itch import ItchService

router = APIRouter(prefix="/users/me/itch", tags=["Itch Integration"])
itch_service = ItchService()


class ConnectItchRequest(BaseModel):
    access_token: str


class SyncResultResponse(BaseModel):
    new_games_count: int
    updated_games_count: int


class ItchAccountResponse(BaseModel):
    id: str
    itch_id: str
    username: str
    avatar_url: str | None
    last_sync_at: datetime | None

    model_config = {"from_attributes": True}


@router.get("/accounts", response_model=List[ItchAccountResponse])
def get_connected_accounts(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Lista todas as contas Itch.io conectadas do usuário."""
    return db.query(ItchAccount).filter(ItchAccount.user_id == current_user.id).all()


@router.post("/accounts", response_model=ItchAccountResponse)
async def connect_itch_account(
    body: ConnectItchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Vincula uma nova conta Itch.io usando o token de acesso."""
    # Valida o token e pega o perfil
    profile = await itch_service.get_profile(body.access_token)

    itch_id = str(profile.get("id"))
    username = profile.get("username")
    avatar_url = profile.get("cover_url")

    if not itch_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não foi possível obter os dados do perfil com este token.",
        )

    # Verifica se já está conectado
    existing = (
        db.query(ItchAccount)
        .filter(ItchAccount.user_id == current_user.id, ItchAccount.itch_id == itch_id)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Esta conta itch.io já está conectada ao seu perfil.",
        )

    new_account = ItchAccount(
        user_id=current_user.id,
        itch_id=itch_id,
        username=username,
        avatar_url=avatar_url,
        access_token=body.access_token,
        last_sync_at=None,
    )
    db.add(new_account)
    db.commit()
    db.refresh(new_account)

    # Sincroniza imediatamente os jogos da nova conta inline
    await sync_single_account(new_account, db)

    return new_account


@router.delete("/accounts/{account_id}")
async def disconnect_itch_account(
    account_id: str,
    delete_games: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Desvincula uma conta itch.io conectada e opcionalmente remove seus jogos."""
    account = (
        db.query(ItchAccount)
        .filter(ItchAccount.id == account_id, ItchAccount.user_id == current_user.id)
        .first()
    )
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Conta itch.io não encontrada."
        )

    if delete_games:
        # Pega os IDs de todos os jogos daquela loja específicos do usuário
        # Aqui, poderíamos buscar todos os jogos que possuem a plataforma itch.io (STORE='ITCH')
        # Para simplificar, assumiremos que jogos vindos da itch têm store='ITCH'
        itch_games = (
            db.query(UserGame)
            .filter(
                UserGame.user_id == current_user.id,
                UserGame.store == "ITCH",
            )
            .all()
        )
        for ug in itch_games:
            db.delete(ug)

        cleanup_empty_auto_lists(current_user.id, db)

    db.delete(account)
    db.commit()

    return {"message": "Conta itch.io desconectada com sucesso."}


async def sync_single_account(account: ItchAccount, db: Session) -> dict:
    """Função core para sincronizar jogos de uma conta itch.io específica."""
    owned_keys = await itch_service.get_owned_keys(account.access_token)
    my_games = await itch_service.get_my_games(account.access_token)

    # Converter my_games para o mesmo formato de owned_keys (que possui a chave "game")
    all_items = owned_keys + [{"game": game} for game in my_games]

    new_games_count = 0
    updated_games_count = 0

    for item in all_items:
        game_data = item.get("game", {})
        game_id_itch = str(game_data.get("id"))
        if not game_id_itch or game_id_itch == "None":
            continue

        title = game_data.get("title")
        cover_url = game_data.get("cover_url")

        # Verifica se o jogo já existe globalmente no banco por um identificador
        # (Neste momento a tabela Game não tem um campo itch_id, usaremos external_id)
        game_id_int = int(game_id_itch) if str(game_id_itch).isdigit() else None

        if game_id_int:
            game_db = db.query(Game).filter(Game.external_id == game_id_int).first()
        else:
            game_db = db.query(Game).filter(Game.title == title).first()

        if not game_db:
            game_db = Game(
                title=title,
                cover_url=cover_url,
                external_id=game_id_int,
            )
            db.add(game_db)
            db.commit()
            db.refresh(game_db)

        # Verifica se o usuário já possui este jogo na biblioteca (qualquer store)
        user_game = (
            db.query(UserGame)
            .filter(UserGame.user_id == account.user_id, UserGame.game_id == game_db.id)
            .first()
        )

        if not user_game:
            user_game = UserGame(
                user_id=account.user_id,
                game_id=game_db.id,
                status="Quero Jogar",  # Valor padrão
                store="ITCH",
            )
            db.add(user_game)
            new_games_count += 1
        else:
            updated_games_count += 1

    account.last_sync_at = datetime.now(timezone.utc)
    db.commit()

    return {
        "new_games_count": new_games_count,
        "updated_games_count": updated_games_count,
    }


@router.post("/accounts/{account_id}/sync", response_model=SyncResultResponse)
async def sync_itch_account_endpoint(
    account_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Sincroniza a biblioteca da conta itch.io manualmente."""
    account = (
        db.query(ItchAccount)
        .filter(ItchAccount.id == account_id, ItchAccount.user_id == current_user.id)
        .first()
    )
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Conta itch.io não encontrada."
        )

    result = await sync_single_account(account, db)
    return result


@router.post("/sync", response_model=SyncResultResponse)
async def sync_all_itch_accounts_endpoint(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Sincroniza a biblioteca de todas as contas itch.io."""
    accounts = db.query(ItchAccount).filter(ItchAccount.user_id == current_user.id).all()
    if not accounts:
        return SyncResultResponse(new_games_count=0, updated_games_count=0)

    total_new = 0
    total_updated = 0

    for account in accounts:
        result = await sync_single_account(account, db)
        total_new += result["new_games_count"]
        total_updated += result["updated_games_count"]

    return SyncResultResponse(new_games_count=total_new, updated_games_count=total_updated)
