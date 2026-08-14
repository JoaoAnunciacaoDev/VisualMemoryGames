from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import SessionLocal, get_db
from app.models.activity import Activity
from app.models.custom_lists import CustomList, custom_list_games
from app.models.game import Game
from app.models.gog_account import GogAccount
from app.models.tierlist import TierCategory, TierItem, TierList
from app.models.user import User
from app.models.user_game import UserGame
from app.security import get_current_user
from app.services.custom_list_service import cleanup_empty_auto_lists, sync_auto_list
from app.services.gog import GogService

router = APIRouter(prefix="/users/me/gog", tags=["GOG Integration"])
gog_service = GogService()
ACTIVE_GOG_SYNC_USERS = set()
db_session_maker = SessionLocal


class ConnectGogRequest(BaseModel):
    profile_url: str


class GogAccountResponse(BaseModel):
    id: str
    username: str
    persona_name: Optional[str] = None
    avatar_url: Optional[str] = None
    last_sync_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class SyncResultResponse(BaseModel):
    new_games_count: int
    updated_games_count: int


@router.get("/accounts", response_model=List[GogAccountResponse])
def get_connected_accounts(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Lista todas as contas GOG conectadas do usuário."""
    return db.query(GogAccount).filter(GogAccount.user_id == current_user.id).all()


async def sync_gog_account_in_background(account_id: str, user_id: str):
    """Executa a sincronização completa da biblioteca GOG em segundo plano."""
    ACTIVE_GOG_SYNC_USERS.add(str(user_id))
    try:
        db = db_session_maker()
        try:
            account = db.query(GogAccount).filter(GogAccount.id == account_id).first()
            if not account:
                return
            username = account.username
        finally:
            db.close()

        # Busca assíncrona dos jogos fora da sessão do banco
        gog_games = await gog_service.get_public_games(username)
        if not gog_games:
            return

        # Abre sessão para persistir em lote
        db = db_session_maker()
        try:
            account = db.query(GogAccount).filter(GogAccount.id == account_id).first()
            if account:
                await process_gog_games_list(account, gog_games, db)
        finally:
            db.close()
    except Exception as e:
        print(f"Erro no background task de sincronização da GOG: {e}")
    finally:
        ACTIVE_GOG_SYNC_USERS.discard(str(user_id))


@router.post("/accounts", response_model=GogAccountResponse)
async def connect_gog_account(
    body: ConnectGogRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Vincula uma nova conta GOG pública ao usuário e inicia sincronização em background."""
    username = gog_service.extract_username(body.profile_url)
    if not username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nome de usuário ou URL do perfil GOG inválido.",
        )

    # Verifica se a conta já está conectada para este usuário
    existing = (
        db.query(GogAccount)
        .filter(
            GogAccount.user_id == current_user.id,
            func.lower(GogAccount.username) == username.lower(),
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Esta conta GOG já está conectada ao seu perfil.",
        )

    # Valida o perfil público de forma leve e rápida
    profile = await gog_service.get_public_profile(username)

    new_account = GogAccount(
        user_id=current_user.id,
        username=profile.get("username", username),
        persona_name=profile.get("persona_name"),
        avatar_url=profile.get("avatar_url"),
        last_sync_at=None,
    )
    db.add(new_account)
    db.commit()
    db.refresh(new_account)

    # Dispara a importação dos jogos em segundo plano
    background_tasks.add_task(
        sync_gog_account_in_background, new_account.id, str(current_user.id)
    )

    return new_account


@router.delete("/accounts/{account_id}")
async def disconnect_gog_account(
    account_id: str,
    delete_games: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Desvincula uma conta GOG conectada e opcionalmente remove seus jogos."""
    account = (
        db.query(GogAccount)
        .filter(GogAccount.id == account_id, GogAccount.user_id == current_user.id)
        .first()
    )
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Conta GOG não encontrada."
        )

    if delete_games:
        # Encontra jogos associados à loja GOG para este usuário
        gog_user_games_query = db.query(UserGame).filter(
            UserGame.user_id == current_user.id,
            UserGame.store == "GOG",
        )
        game_ids = [ug.game_id for ug in gog_user_games_query.all()]

        if game_ids:
            # Deleta as associações em Custom Lists
            db.execute(
                custom_list_games.delete().where(
                    custom_list_games.c.game_id.in_(game_ids),
                    custom_list_games.c.custom_list_id.in_(
                        db.query(CustomList.id).filter(CustomList.user_id == current_user.id)
                    ),
                )
            )

            # Deleta os itens em Tier Lists
            db.query(TierItem).filter(
                TierItem.game_id.in_(game_ids),
                TierItem.category_id.in_(
                    db.query(TierCategory.id)
                    .join(TierList)
                    .filter(TierList.user_id == current_user.id)
                ),
            ).delete(synchronize_session=False)

            # Deleta os registros em UserGame
            gog_user_games_query.delete(synchronize_session=False)

        cleanup_empty_auto_lists(current_user.id, db)

    db.delete(account)
    db.commit()

    return {"message": "Conta GOG desconectada com sucesso."}


async def process_gog_games_list(account: GogAccount, gog_games: list, db: Session) -> dict:
    """Processa a lista de jogos do GOG e persiste no banco em lote com alta performance."""
    new_games_count = 0
    updated_games_count = 0

    if not gog_games:
        return {"new_games_count": 0, "updated_games_count": 0}

    # 1. Pré-carrega jogos existentes no catálogo em lotes de 500
    titles_lower = list({g["title"].strip().lower() for g in gog_games if g.get("title")})
    existing_games = {}
    for i in range(0, len(titles_lower), 500):
        chunk = titles_lower[i : i + 500]
        found = db.query(Game).filter(func.lower(Game.title).in_(chunk)).all()
        for g_db in found:
            existing_games[g_db.title.lower().strip()] = g_db

    # 2. Pré-carrega jogos da biblioteca do usuário
    user_games_map = {
        ug.game_id: ug
        for ug in db.query(UserGame).filter(UserGame.user_id == account.user_id).all()
    }

    platinized_to_sync = []

    for g_item in gog_games:
        title = g_item.get("title")
        if not title:
            continue

        clean_title = title.strip()
        title_key = clean_title.lower()
        cover_url = g_item.get("cover_url")
        hours_played = g_item.get("hours_played", 0.0)
        is_platinized = g_item.get("is_platinized", False)
        platinum_date = g_item.get("platinum_date")

        # 1. Procura se o jogo já existe globalmente no dicionário em memória
        game = existing_games.get(title_key)
        if not game:
            game = Game(
                title=clean_title,
                cover_url=cover_url,
                platforms=["PC"],
                genres=[],
                release_year=None,
                is_manual=False,
            )
            db.add(game)
            db.flush()
            existing_games[title_key] = game

        # 2. Verifica se o usuário já possui este jogo na biblioteca em memória
        user_game = user_games_map.get(game.id)

        if not user_game:
            status_init = (
                "Platinado" if is_platinized else ("Jogando" if hours_played > 0 else "Quero Jogar")
            )
            plat_at = platinum_date if is_platinized else None

            user_game = UserGame(
                user_id=account.user_id,
                game_id=game.id,
                game=game,
                rating=None,
                status=status_init,
                hours_played=hours_played,
                store="GOG",
                acquired_at=None,
                platinum_at=plat_at,
                favorite=False,
            )
            db.add(user_game)
            user_games_map[game.id] = user_game
            new_games_count += 1

            # Registra atividade de adição
            db.add(
                Activity(
                    user_id=str(account.user_id),
                    game_id=str(game.id),
                    action_type="ADDED",
                )
            )

            # Se platinado na criação, agenda sync de auto-list
            if status_init == "Platinado":
                db.add(
                    Activity(
                        user_id=str(account.user_id),
                        game_id=str(game.id),
                        action_type="PLATINUM",
                    )
                )
                platinized_to_sync.append(user_game)
        else:
            old_status = user_game.status
            old_platinum = user_game.platinum_at
            has_changes = False

            if is_platinized:
                if user_game.status != "Platinado":
                    user_game.status = "Platinado"
                    user_game.store = "GOG"
                    has_changes = True
                if not user_game.platinum_at:
                    user_game.platinum_at = platinum_date or datetime.now(timezone.utc).date()
                    has_changes = True

            if user_game.hours_played is None or hours_played > user_game.hours_played:
                user_game.hours_played = hours_played
                user_game.store = "GOG"
                has_changes = True

            if not user_game.store:
                user_game.store = "GOG"
                has_changes = True

            if has_changes:
                updated_games_count += 1
                if old_status != user_game.status:
                    db.add(
                        Activity(
                            user_id=str(account.user_id),
                            game_id=str(game.id),
                            action_type="UPDATED_STATUS",
                            context=user_game.status,
                        )
                    )
                if old_status != "Platinado" and user_game.status == "Platinado":
                    db.add(
                        Activity(
                            user_id=str(account.user_id),
                            game_id=str(game.id),
                            action_type="PLATINUM",
                        )
                    )
                if old_platinum != user_game.platinum_at and user_game.platinum_at is not None:
                    platinized_to_sync.append(user_game)

    account.last_sync_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()

    # Sincroniza listas automáticas dos jogos platinados
    for ug in platinized_to_sync:
        sync_auto_list(
            user_id=str(account.user_id),
            user_game=ug,
            field_name="platinum_at",
            list_type="platinized_year",
            db=db,
        )

    return {
        "new_games_count": new_games_count,
        "updated_games_count": updated_games_count,
    }


async def sync_single_account(account: GogAccount, db: Session) -> dict:
    """Função core para sincronizar jogos de uma conta GOG específica."""
    gog_games = await gog_service.get_public_games(account.username)
    return await process_gog_games_list(account, gog_games, db)


@router.post("/accounts/{account_id}/sync", response_model=SyncResultResponse)
async def sync_single_gog_account_endpoint(
    account_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Sincroniza os jogos de uma conta GOG específica."""
    account = (
        db.query(GogAccount)
        .filter(GogAccount.id == account_id, GogAccount.user_id == current_user.id)
        .first()
    )
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Conta GOG não encontrada."
        )

    res = await sync_single_account(account, db)
    return SyncResultResponse(
        new_games_count=res["new_games_count"],
        updated_games_count=res["updated_games_count"],
    )


@router.post("/sync", response_model=SyncResultResponse)
async def sync_all_gog_accounts_endpoint(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Sincroniza os jogos de todas as contas GOG conectadas do usuário."""
    accounts = db.query(GogAccount).filter(GogAccount.user_id == current_user.id).all()
    if not accounts:
        return SyncResultResponse(new_games_count=0, updated_games_count=0)

    total_new = 0
    total_updated = 0
    for account in accounts:
        res = await sync_single_account(account, db)
        total_new += res["new_games_count"]
        total_updated += res["updated_games_count"]

    return SyncResultResponse(new_games_count=total_new, updated_games_count=total_updated)
