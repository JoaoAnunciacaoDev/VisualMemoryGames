import asyncio
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from app.database import get_db
from app.models.game import Game
from app.models.game_provider_id import GameProviderId
from app.models.itch_account import ItchAccount
from app.models.user import User
from app.models.user_game import UserGame
from app.security import get_current_user
from app.services.custom_list_service import cleanup_empty_auto_lists
from app.services.itch import ItchService
from app.services.secret_storage import SecretDecryptionError, decrypt_secret, encrypt_secret

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
    return (
        db.query(ItchAccount)
        .filter(ItchAccount.user_id == current_user.id)
        .order_by(ItchAccount.id)
        .limit(20)
        .all()
    )


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
        access_token=encrypt_secret(body.access_token),
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
    try:
        access_token, was_plaintext = decrypt_secret(str(account.access_token))
    except SecretDecryptionError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A credencial da conta itch.io precisa ser reconectada.",
        ) from exc
    if was_plaintext:
        account.access_token = encrypt_secret(access_token)
        db.commit()
    db.rollback()
    owned_keys, my_games = await asyncio.gather(
        itch_service.get_owned_keys(access_token),
        itch_service.get_my_games(access_token),
    )

    all_items = owned_keys + [{"game": game} for game in my_games]
    return await run_in_threadpool(_persist_itch_games, account, all_items, db)


def _persist_itch_games(account: ItchAccount, all_items: list, db: Session) -> dict:
    """Persiste uma biblioteca Itch em lote, com IDs externos separados por provider."""
    from app.models.activity import Activity

    deduplicated = {}
    for item in all_items:
        game_data = item.get("game", {})
        external_id = str(game_data.get("id"))
        if external_id and external_id != "None":
            deduplicated.setdefault(external_id, game_data)

    external_ids = list(deduplicated)
    provider_links = (
        db.query(GameProviderId)
        .filter(
            GameProviderId.provider == "ITCH",
            GameProviderId.external_id.in_(external_ids),
        )
        .all()
        if external_ids
        else []
    )
    games_by_external_id = {link.external_id: link.game for link in provider_links}

    title_keys = {
        data.get("title", "").strip().lower()
        for external_id, data in deduplicated.items()
        if external_id not in games_by_external_id and data.get("title")
    }
    games_by_title = {}
    title_list = list(title_keys)
    for index in range(0, len(title_list), 500):
        for game in (
            db.query(Game).filter(func.lower(Game.title).in_(title_list[index : index + 500])).all()
        ):
            games_by_title[game.title.strip().lower()] = game

    games_to_create = []
    links_to_create = []
    for external_id, game_data in deduplicated.items():
        if external_id in games_by_external_id:
            continue
        title = game_data.get("title") or f"Itch.io Game {external_id}"
        game = games_by_title.get(title.strip().lower())
        if not game:
            game = Game(title=title, cover_url=game_data.get("cover_url"))
            db.add(game)
            games_to_create.append(game)
            games_by_title[title.strip().lower()] = game
        games_by_external_id[external_id] = game
        links_to_create.append((external_id, game))

    if games_to_create:
        db.flush()
    for external_id, game in links_to_create:
        db.add(GameProviderId(provider="ITCH", external_id=external_id, game_id=game.id))
    if links_to_create:
        db.flush()

    game_ids = [game.id for game in games_by_external_id.values()]
    user_games = {
        user_game.game_id: user_game
        for user_game in db.query(UserGame)
        .filter(UserGame.user_id == account.user_id, UserGame.game_id.in_(game_ids))
        .all()
    }

    new_games_count = 0
    updated_games_count = 0
    for external_id, game_data in deduplicated.items():
        game_db = games_by_external_id[external_id]
        user_game = user_games.get(game_db.id)

        if not user_game:
            user_game = UserGame(
                user_id=account.user_id,
                game_id=game_db.id,
                game=game_db,
                status="Na biblioteca",  # Valor padrão
                store="ITCH",
            )
            db.add(user_game)
            user_games[game_db.id] = user_game
            new_games_count += 1
            db.add(
                Activity(
                    user_id=str(account.user_id),
                    game_id=str(game_db.id),
                    action_type="ADDED",
                )
            )
        else:
            if not user_game.store:
                user_game.store = "ITCH"
            updated_games_count += 1

    account.last_sync_at = datetime.now(timezone.utc)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

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
