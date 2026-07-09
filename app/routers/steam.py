import asyncio
import re
from datetime import date, datetime
from typing import List

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.game import Game
from app.models.steam_account import SteamAccount
from app.models.user import User
from app.models.user_game import UserGame
from app.security import get_current_user
from app.services.steam import SteamService

router = APIRouter(prefix="/users/me/steam", tags=["Steam Integration"])
steam_service = SteamService()


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
def disconnect_steam_account(
    account_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Desvincula uma conta Steam conectada."""
    account = (
        db.query(SteamAccount)
        .filter(SteamAccount.id == account_id, SteamAccount.user_id == current_user.id)
        .first()
    )
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Conta Steam não encontrada."
        )

    db.delete(account)
    db.commit()
    return {"message": "Conta Steam desconectada com sucesso."}


@router.post("/sync", response_model=SyncResultResponse)
async def sync_steam_games(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Sincroniza todos os jogos de todas as contas Steam conectadas do usuário."""
    accounts = db.query(SteamAccount).filter(SteamAccount.user_id == current_user.id).all()
    if not accounts:
        return SyncResultResponse(new_games_count=0, updated_games_count=0)

    total_new = 0
    total_updated = 0

    for account in accounts:
        new_cnt, upd_cnt = await sync_single_account(account, db)
        total_new += new_cnt
        total_updated += upd_cnt

    return SyncResultResponse(new_games_count=total_new, updated_games_count=total_updated)


async def sync_single_account(account: SteamAccount, db: Session) -> tuple[int, int]:
    """Auxiliar para sincronizar uma conta Steam individual e salvar no banco."""
    new_games_count = 0
    updated_games_count = 0

    try:
        steam_games = await steam_service.get_owned_games(account.steam_id)
        # Busca os jogos jogados recentemente (últimas 2 semanas)
        recent_games = await steam_service.get_recently_played_games(account.steam_id)
    except Exception as e:
        print(f"Erro ao sincronizar conta Steam {account.steam_id}: {e}")
        return 0, 0

    if not steam_games:
        return 0, 0

    # Conjunto de appids jogados recentemente
    recent_appids = {g.get("appid") for g in recent_games if g.get("appid")}

    # Busca os jogos existentes no banco para determinar quais precisam de detalhes (gêneros/ano)
    existing_games = (
        db.query(Game.steam_appid, Game.genres).filter(Game.steam_appid.isnot(None)).all()
    )
    appids_with_genres = {appid for appid, genres in existing_games if genres and genres != "[]"}
    existing_appids = {appid for appid, _ in existing_games}

    appids_to_fetch = [
        sg["appid"]
        for sg in steam_games
        if sg.get("appid")
        and (sg["appid"] not in existing_appids or sg["appid"] not in appids_with_genres)
    ][:40]

    # Busca as conquistas concorrentemente para todos os jogos com tempo de jogo
    games_to_check = [g for g in steam_games if g.get("playtime_forever", 0) > 0]
    platinized_game_dates = {}
    app_details = {}

    sem_plat = asyncio.Semaphore(10)
    sem_details = asyncio.Semaphore(3)  # concorrência menor para evitar 429 na Steam Store

    async with httpx.AsyncClient() as client:
        # Define tarefas para conquistas
        async def check_platinum(appid: int):
            async with sem_plat:
                plat_date = await steam_service.is_game_platinized(
                    account.steam_id, appid, client=client
                )
                if plat_date is True:
                    platinized_game_dates[appid] = datetime.utcnow().date()
                elif isinstance(plat_date, date) and not isinstance(plat_date, bool):
                    platinized_game_dates[appid] = plat_date

        # Define tarefas para buscar gêneros e ano
        async def fetch_details(appid: int):
            async with sem_details:
                details = await steam_service.get_game_details(appid, client=client)
                if details:
                    app_details[appid] = details
                await asyncio.sleep(0.15)

        plat_tasks = [check_platinum(g["appid"]) for g in games_to_check]
        details_tasks = [fetch_details(appid) for appid in appids_to_fetch]

        await asyncio.gather(*plat_tasks, *details_tasks)

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
                details = app_details.get(appid)
                if details:
                    import json

                    if not game.genres or game.genres == "[]":
                        game.genres = json.dumps(details.get("genres", []))
                    if not game.release_year and details.get("release_year"):
                        game.release_year = details.get("release_year")
                db.flush()
            else:
                cover = f"https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/{appid}/header.jpg"
                details = app_details.get(appid, {})
                genres_list = details.get("genres", [])
                release_yr = details.get("release_year")

                import json

                game = Game(
                    title=name or f"Steam App {appid}",
                    steam_appid=appid,
                    cover_url=cover,
                    platforms=json.dumps(["PC"]),
                    genres=json.dumps(genres_list),
                    release_year=release_yr,
                    is_manual=False,
                )
                db.add(game)
                db.flush()
        else:
            # Se o jogo já existe no banco por steam_appid, mas não possui gêneros ou ano
            details = app_details.get(appid)
            if details:
                import json

                has_updates = False
                if not game.genres or game.genres == "[]":
                    game.genres = json.dumps(details.get("genres", []))
                    has_updates = True
                if not game.release_year and details.get("release_year"):
                    game.release_year = details.get("release_year")
                    has_updates = True
                if has_updates:
                    db.flush()

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

    account.last_sync_at = datetime.utcnow()
    db.commit()

    return new_games_count, updated_games_count
