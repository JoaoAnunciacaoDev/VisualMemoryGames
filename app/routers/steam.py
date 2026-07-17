import asyncio
import re
from datetime import date, datetime, timezone
from typing import List

import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import SessionLocal, get_db
from app.models.game import Game
from app.models.steam_account import SteamAccount
from app.models.user import User
from app.models.user_game import UserGame
from app.security import get_current_user
from app.services.custom_list_service import cleanup_empty_auto_lists
from app.services.steam import SteamService

router = APIRouter(prefix="/users/me/steam", tags=["Steam Integration"])
steam_service = SteamService()
ACTIVE_SYNC_USERS = set()
db_session_maker = SessionLocal


class ConnectSteamRequest(BaseModel):
    profile_url: str


class SteamAccountResponse(BaseModel):
    id: str
    steam_id: str
    persona_name: str | None
    avatar_url: str | None
    last_sync_at: datetime | None

    model_config = {"from_attributes": True}


class SyncResultResponse(BaseModel):
    new_games_count: int
    updated_games_count: int


def extract_steam_identifier(input_str: str) -> tuple[str, bool]:
    """Retorna o identificador extraído e se ele é um ID numérico direto."""
    clean_str = input_str.strip().rstrip("/")

    # Match URLs customizadas: /id/{username}
    vanity_match = re.search(r"/id/([^/]+)", clean_str)
    if vanity_match:
        return vanity_match.group(1), False

    # Match URLs numéricas: /profiles/{id}
    profiles_match = re.search(r"/profiles/(\d+)", clean_str)
    if profiles_match:
        return profiles_match.group(1), True

    # Se for apenas dígitos numéricos de pelo menos 15 caracteres (ID padrão SteamID64)
    if clean_str.isdigit() and len(clean_str) >= 15:
        return clean_str, True

    # Por padrão, assume que é um vanity name
    return clean_str, False


@router.get("/accounts", response_model=List[SteamAccountResponse])
def get_connected_accounts(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Lista todas as contas Steam conectadas do usuário."""
    return db.query(SteamAccount).filter(SteamAccount.user_id == current_user.id).all()


@router.post("/accounts", response_model=SteamAccountResponse)
async def connect_steam_account(
    body: ConnectSteamRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Vincula uma nova conta Steam ao usuário."""
    identifier, is_numeric = extract_steam_identifier(body.profile_url)

    steam_id = None
    if is_numeric:
        steam_id = identifier
    else:
        # Resolve a URL customizada para ID de 64 bits
        steam_id = await steam_service.resolve_vanity_url(identifier)
        if not steam_id:
            # Tenta verificar se o identificador digitado diretamente já funciona como id
            if identifier.isdigit():
                steam_id = identifier
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        "Não foi possível resolver o link do perfil. Verifique se ele está correto."
                    ),
                )

    # Verifica se já está conectado
    existing = (
        db.query(SteamAccount)
        .filter(SteamAccount.user_id == current_user.id, SteamAccount.steam_id == steam_id)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Esta conta Steam já está conectada ao seu perfil.",
        )

    # Busca o resumo da conta (avatar, apelido) para confirmar validade
    profile = await steam_service.get_player_summary(steam_id)

    new_account = SteamAccount(
        user_id=current_user.id,
        steam_id=steam_id,
        persona_name=profile.get("persona_name"),
        avatar_url=profile.get("avatar_url"),
        last_sync_at=None,
    )
    db.add(new_account)
    db.commit()
    db.refresh(new_account)

    # Sincroniza imediatamente os jogos da nova conta inline
    await sync_single_account(new_account, db)

    return new_account


@router.delete("/accounts/{account_id}")
async def disconnect_steam_account(
    account_id: str,
    delete_games: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Desvincula uma conta Steam conectada e opcionalmente remove seus jogos."""
    account = (
        db.query(SteamAccount)
        .filter(SteamAccount.id == account_id, SteamAccount.user_id == current_user.id)
        .first()
    )
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Conta Steam não encontrada."
        )

    if delete_games:
        from app.models.custom_lists import CustomList, custom_list_games
        from app.models.tierlist import TierCategory, TierItem, TierList

        # Tenta obter os appids vinculados a essa conta Steam para remover apenas eles
        appids_to_remove = []
        try:
            steam_games = await steam_service.get_owned_games(account.steam_id)
            if steam_games:
                appids_to_remove = [g["appid"] for g in steam_games if g.get("appid")]
        except Exception as e:
            print(f"Erro ao obter jogos da Steam para remoção: {e}")

        if appids_to_remove:
            game_ids_query = db.query(Game.id).filter(Game.steam_appid.in_(appids_to_remove))
        else:
            game_ids_query = (
                db.query(Game.id)
                .join(UserGame)
                .filter(UserGame.user_id == current_user.id, UserGame.store == "STEAM")
            )

        # Deleta as associações em Custom Lists
        db.execute(
            custom_list_games.delete().where(
                custom_list_games.c.game_id.in_(game_ids_query),
                custom_list_games.c.custom_list_id.in_(
                    db.query(CustomList.id).filter(CustomList.user_id == current_user.id)
                ),
            )
        )

        # Deleta os itens em Tier Lists
        db.query(TierItem).filter(
            TierItem.game_id.in_(game_ids_query),
            TierItem.category_id.in_(
                db.query(TierCategory.id).join(TierList).filter(TierList.user_id == current_user.id)
            ),
        ).delete(synchronize_session=False)

        # Deleta os registros em UserGame (Biblioteca)
        if appids_to_remove:
            db.query(UserGame).filter(
                UserGame.user_id == current_user.id,
                UserGame.game_id.in_(game_ids_query),
            ).delete(synchronize_session=False)
        else:
            db.query(UserGame).filter(
                UserGame.user_id == current_user.id,
                UserGame.store == "STEAM",
            ).delete(synchronize_session=False)

    db.delete(account)
    db.commit()

    cleanup_empty_auto_lists(current_user.id, db)

    return {"message": "Conta Steam desconectada com sucesso."}


async def fetch_game_genres_in_background(appids: List[int], user_id: str):
    """Busca gêneros e ano de lançamento de uma lista de AppIDs da Steam em segundo plano."""
    try:
        async with httpx.AsyncClient() as client:
            for appid in appids:
                # 1. Abre sessão curta para verificar se precisa atualizar
                db = db_session_maker()
                try:
                    game = db.query(Game).filter(Game.steam_appid == appid).first()
                    if not game or (game.genres and game.genres != [] and game.genres != "[]"):
                        continue
                finally:
                    db.close()

                # 2. Faz a requisição assíncrona de rede (fora de transação de banco)
                details = None
                try:
                    details = await steam_service.get_game_details(appid, client=client)
                except Exception as e:
                    print(f"Erro ao buscar detalhes do appid {appid}: {e}")

                # 3. Abre nova sessão curta para atualizar e salvar
                db = db_session_maker()
                try:
                    game = db.query(Game).filter(Game.steam_appid == appid).first()
                    if game:
                        genres_val = []
                        release_yr = None
                        if details:
                            if details.get("genres"):
                                genres_val = details["genres"]
                            if details.get("release_year"):
                                release_yr = details["release_year"]

                        game.genres = genres_val
                        if release_yr:
                            game.release_year = release_yr
                        db.commit()
                except Exception as e:
                    print(f"Erro no background task ao salvar detalhes para appid {appid}: {e}")
                finally:
                    db.close()

                # Sleep de 1.5 segundos para evitar 429 da Steam Store
                await asyncio.sleep(1.5)
    except Exception as e:
        print(f"Erro geral no background task: {e}")
    finally:
        ACTIVE_SYNC_USERS.discard(str(user_id))


@router.post("/sync", response_model=SyncResultResponse)
async def sync_steam_games(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Sincroniza todos os jogos de todas as contas Steam conectadas do usuário."""
    accounts = db.query(SteamAccount).filter(SteamAccount.user_id == current_user.id).all()
    if not accounts:
        return SyncResultResponse(new_games_count=0, updated_games_count=0)

    total_new = 0
    total_updated = 0
    all_missing_genres_appids = []

    for account in accounts:
        new_cnt, upd_cnt, missing_ids = await sync_single_account(account, db)
        total_new += new_cnt
        total_updated += upd_cnt
        all_missing_genres_appids.extend(missing_ids)

    if all_missing_genres_appids:
        unique_appids = list(set(all_missing_genres_appids))
        ACTIVE_SYNC_USERS.add(str(current_user.id))
        background_tasks.add_task(
            fetch_game_genres_in_background, unique_appids, str(current_user.id)
        )

    return SyncResultResponse(new_games_count=total_new, updated_games_count=total_updated)


@router.post("/accounts/{account_id}/sync", response_model=SyncResultResponse)
async def sync_single_steam_account_endpoint(
    account_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Sincroniza os jogos de uma conta Steam específica."""
    account = (
        db.query(SteamAccount)
        .filter(SteamAccount.id == account_id, SteamAccount.user_id == current_user.id)
        .first()
    )
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Conta Steam não encontrada."
        )

    new_cnt, upd_cnt, missing_ids = await sync_single_account(account, db)

    if missing_ids:
        unique_appids = list(set(missing_ids))
        ACTIVE_SYNC_USERS.add(str(current_user.id))
        background_tasks.add_task(
            fetch_game_genres_in_background, unique_appids, str(current_user.id)
        )

    return SyncResultResponse(new_games_count=new_cnt, updated_games_count=upd_cnt)


async def sync_single_account(account: SteamAccount, db: Session) -> tuple[int, int, List[int]]:
    """Auxiliar para sincronizar uma conta Steam individual e salvar no banco."""
    new_games_count = 0
    updated_games_count = 0
    missing_genres_appids = []

    try:
        steam_games = await steam_service.get_owned_games(account.steam_id)
        # Busca os jogos jogados recentemente (últimas 2 semanas)
        recent_games = await steam_service.get_recently_played_games(account.steam_id)
    except Exception as e:
        print(f"Erro ao sincronizar conta Steam {account.steam_id}: {e}")
        return 0, 0, []

    if not steam_games:
        return 0, 0, []

    # Conjunto de appids jogados recentemente
    recent_appids = {g.get("appid") for g in recent_games if g.get("appid")}

    # Busca as conquistas concorrentemente para todos os jogos com tempo de jogo
    games_to_check = [g for g in steam_games if g.get("playtime_forever", 0) > 0]
    platinized_game_dates = {}

    sem_plat = asyncio.Semaphore(10)

    async with httpx.AsyncClient() as client:
        # Define tarefas para conquistas
        async def check_platinum(appid: int):
            async with sem_plat:
                plat_date = await steam_service.is_game_platinized(
                    account.steam_id, appid, client=client
                )
                if plat_date is True:
                    platinized_game_dates[appid] = datetime.now(timezone.utc).date()
                elif isinstance(plat_date, date) and not isinstance(plat_date, bool):
                    platinized_game_dates[appid] = plat_date

        plat_tasks = [check_platinum(g["appid"]) for g in games_to_check]
        await asyncio.gather(*plat_tasks)

    for sg in steam_games:
        appid = sg.get("appid")
        name = sg.get("name")
        playtime_forever = sg.get("playtime_forever", 0)
        hours = round(playtime_forever / 60, 1)

        # 1. Verifica se o jogo existe pelo steam_appid
        game = db.query(Game).filter(Game.steam_appid == appid).first()
        if not game:
            if name:
                game = db.query(Game).filter(func.lower(Game.title) == name.lower().strip()).first()

            if game:
                game.steam_appid = appid
                # Se o jogo associado não possui gêneros, adiciona para buscar em background
                if not game.genres or game.genres == [] or game.genres == "[]":
                    missing_genres_appids.append(appid)
                db.flush()
            else:
                cover = f"https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/{appid}/header.jpg"
                game = Game(
                    title=name or f"Steam App {appid}",
                    steam_appid=appid,
                    cover_url=cover,
                    platforms=["PC"],
                    genres=[],
                    release_year=None,
                    is_manual=False,
                )
                db.add(game)
                db.flush()
                # Adiciona para buscar em background
                missing_genres_appids.append(appid)
        else:
            if not game.genres or game.genres == [] or game.genres == "[]":
                missing_genres_appids.append(appid)

        # 2. Verifica se o usuário já tem o jogo na biblioteca
        user_game = (
            db.query(UserGame)
            .filter(UserGame.user_id == account.user_id, UserGame.game_id == game.id)
            .first()
        )

        is_platinized = appid in platinized_game_dates
        is_recent = appid in recent_appids

        if not user_game:
            # Classifica o status inicial:
            # - Se platinou: "Platinado"
            # - Se jogou recentemente: "Jogando"
            # - Senão: "Quero Jogar"
            status_init = "Quero Jogar"
            platinum_date = None
            if is_platinized:
                status_init = "Platinado"
                platinum_date = platinized_game_dates[appid]
            elif is_recent:
                status_init = "Jogando"

            user_game = UserGame(
                user_id=account.user_id,
                game_id=game.id,
                rating=None,
                status=status_init,
                hours_played=hours,
                store="STEAM",
                acquired_at=None,
                platinum_at=platinum_date,
                favorite=False,
            )
            db.add(user_game)
            new_games_count += 1
        else:
            has_changes = False
            # Se platinou na Steam e o status local não reflete isso ou a data está em branco
            if is_platinized:
                if user_game.status != "Platinado":
                    user_game.status = "Platinado"
                    has_changes = True
                if not user_game.platinum_at:
                    user_game.platinum_at = platinized_game_dates[appid]
                    has_changes = True

            if user_game.hours_played is None or hours > user_game.hours_played:
                user_game.hours_played = hours
                has_changes = True
            if user_game.store != "STEAM":
                user_game.store = "STEAM"
                has_changes = True

            if has_changes:
                updated_games_count += 1

    account.last_sync_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()

    return new_games_count, updated_games_count, missing_genres_appids
