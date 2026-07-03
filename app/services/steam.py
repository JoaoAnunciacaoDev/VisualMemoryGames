import os
from datetime import date, datetime

import httpx
from fastapi import HTTPException

STEAM_API_URL = "http://api.steampowered.com"


class SteamService:
    def __init__(self):
        self.api_key = os.getenv("STEAM_API_KEY")

    def _check_api_key(self):
        if not self.api_key:
            raise HTTPException(
                status_code=500,
                detail="STEAM_API_KEY não configurada no servidor. Adicione ao arquivo .env.",
            )

    async def resolve_vanity_url(self, vanity_url: str) -> str | None:
        """Resolve um vanityurl da Steam (nome customizado no link de perfil) para SteamID64."""
        self._check_api_key()
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{STEAM_API_URL}/ISteamUser/ResolveVanityURL/v0001/",
                    params={"key": self.api_key, "vanityurl": vanity_url},
                )
                response.raise_for_status()
                data = response.json().get("response", {})
                if data.get("success") == 1:
                    return data.get("steamid")
                return None
            except Exception as e:
                print(f"Erro ao resolver vanity URL: {e}")
                return None

    async def get_player_summary(self, steam_id: str) -> dict:
        """Busca o nome e o avatar da conta Steam."""
        self._check_api_key()
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{STEAM_API_URL}/ISteamUser/GetPlayerSummaries/v0002/",
                    params={"key": self.api_key, "steamids": steam_id},
                )
                response.raise_for_status()
                players = response.json().get("response", {}).get("players", [])
                if players:
                    player = players[0]
                    return {
                        "steam_id": steam_id,
                        "persona_name": player.get("personaname"),
                        "avatar_url": player.get("avatarfull"),
                    }
                raise HTTPException(
                    status_code=404, detail="Nenhum perfil encontrado para este SteamID."
                )
            except httpx.HTTPStatusError as e:
                raise HTTPException(
                    status_code=e.response.status_code,
                    detail=f"Erro na API da Steam: {e.response.text}",
                )
            except Exception as e:
                raise HTTPException(
                    status_code=500, detail=f"Erro interno de integração com a Steam: {str(e)}"
                )

    async def get_owned_games(self, steam_id: str) -> list[dict]:
        """Busca todos os jogos da conta Steam."""
        self._check_api_key()
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{STEAM_API_URL}/IPlayerService/GetOwnedGames/v0001/",
                    params={
                        "key": self.api_key,
                        "steamid": steam_id,
                        "include_appinfo": "true",
                        "include_played_free_games": "true",
                    },
                )
                response.raise_for_status()
                data = response.json().get("response", {})
                return data.get("games", [])
            except httpx.HTTPStatusError as e:
                raise HTTPException(
                    status_code=e.response.status_code,
                    detail=f"Erro na API da Steam ao listar jogos: {e.response.text}",
                )
            except Exception as e:
                raise HTTPException(
                    status_code=500, detail=f"Erro interno ao buscar jogos da Steam: {str(e)}"
                )

    async def get_recently_played_games(self, steam_id: str) -> list[dict]:
        """Busca os jogos jogados recentemente (últimas 2 semanas)."""
        self._check_api_key()
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{STEAM_API_URL}/IPlayerService/GetRecentlyPlayedGames/v0001/",
                    params={
                        "key": self.api_key,
                        "steamid": steam_id,
                    },
                )
                response.raise_for_status()
                data = response.json().get("response", {})
                return data.get("games", [])
            except Exception:
                return []

    async def is_game_platinized(
        self, steam_id: str, appid: int, client: httpx.AsyncClient = None
    ) -> date | None:
        """Verifica se o jogador completou 100% das conquistas do jogo (Platinou).
        Retorna a data da última conquista (platina) ou None se não platinado.
        """
        self._check_api_key()

        async def fetch(c: httpx.AsyncClient) -> date | None:
            response = await c.get(
                f"{STEAM_API_URL}/ISteamUserStats/GetPlayerAchievements/v0001/",
                params={
                    "key": self.api_key,
                    "steamid": steam_id,
                    "appid": appid,
                },
                timeout=3.0,
            )
            if response.status_code != 200:
                return None
            data = response.json().get("playerstats", {})
            if not data.get("success"):
                return None
            achievements = data.get("achievements", [])
            if not achievements:
                return None

            is_plat = all(ach.get("achieved") == 1 for ach in achievements)
            if not is_plat:
                return None

            # Pega o timestamp da última conquista obtida
            unlock_times = [ach.get("unlocktime", 0) for ach in achievements]
            max_unlock = max(unlock_times) if unlock_times else 0
            if max_unlock > 0:
                return datetime.fromtimestamp(max_unlock).date()
            return datetime.utcnow().date()

        if client is not None:
            try:
                return await fetch(client)
            except Exception:
                return None
        else:
            async with httpx.AsyncClient() as c:
                try:
                    return await fetch(c)
                except Exception:
                    return None
