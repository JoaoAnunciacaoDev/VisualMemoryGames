import re
from datetime import datetime, timezone
from typing import List

import httpx
from fastapi import HTTPException, status

GOG_BASE_URL = "https://www.gog.com"
DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)


class GogService:
    def extract_username(self, input_str: str) -> str:
        """Extrai o nome de usuário do GOG a partir de uma URL ou string direta."""
        clean_str = input_str.strip().rstrip("/")
        # Trata links como https://www.gog.com/u/usuario ou /u/usuario/games
        match = re.search(r"/u/([^/?#]+)", clean_str)
        if match:
            return match.group(1).strip()
        # Se for apenas o nome de usuário digitado
        return clean_str

    async def get_public_profile(self, username: str) -> dict:
        """Valida se o perfil público do GOG existe e busca avatar/dados básicos."""
        headers = {"User-Agent": DEFAULT_USER_AGENT}
        async with httpx.AsyncClient(
            headers=headers, follow_redirects=True, timeout=10.0
        ) as client:
            try:
                response = await client.get(f"{GOG_BASE_URL}/u/{username}")
                if response.status_code == 404:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Perfil do GOG '{username}' não foi encontrado.",
                    )
                if response.status_code != 200:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=(
                            f"Erro ao acessar perfil do GOG ({response.status_code}). "
                            "Verifique se o usuário existe."
                        ),
                    )

                html = response.text
                avatar_url = None
                persona_name = username
                resolved_username = username

                # 1. Tenta extrair do window.profilesData.profileUser embedded no HTML
                import json

                profile_match = re.search(
                    r"window\.profilesData\.profileUser\s*=\s*(\{.*?\});\s*(?:window\.|\n|<)",
                    html,
                )
                if not profile_match:
                    profile_match = re.search(
                        r"window\.profilesData\.profileUser\s*=\s*(\{.*?\});", html
                    )

                if profile_match:
                    try:
                        p_data = json.loads(profile_match.group(1))
                        resolved_username = p_data.get("username") or username
                        persona_name = resolved_username
                        avatar_url = p_data.get("avatar") or (
                            p_data.get("avatars", {}).get("large")
                            if isinstance(p_data.get("avatars"), dict)
                            else None
                        )
                    except Exception as e:
                        print(f"Erro ao fazer parse do JSON do perfil GOG: {e}")

                # 2. Fallbacks via regex no HTML caso o JSON não esteja presente
                if not avatar_url:
                    avatar_match = re.search(
                        r'<img[^>]+class="[^"]*profile-header__avatar[^"]*"[^>]+src="([^"]+)"',
                        html,
                    )
                    if not avatar_match:
                        avatar_match = re.search(
                            r'<img[^>]+src="([^"]+)"[^>]+class="[^"]*avatar[^"]*"',
                            html,
                        )
                    if avatar_match:
                        avatar_url = avatar_match.group(1)
                        if avatar_url.startswith("//"):
                            avatar_url = f"https:{avatar_url}"

                if persona_name == username:
                    name_match = re.search(
                        r'<h1[^>]*class="[^"]*profile-header__title[^"]*"[^>]*>\s*([^<]+)\s*</h1>',
                        html,
                    )
                    if name_match:
                        persona_name = name_match.group(1).strip()

                return {
                    "username": resolved_username,
                    "persona_name": persona_name,
                    "avatar_url": avatar_url,
                }
            except HTTPException:
                raise
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Erro de comunicação ao consultar o GOG: {str(e)}",
                )

    async def get_public_games(self, username: str) -> List[dict]:
        """Busca os jogos, horas jogadas e conquistas a partir do perfil público do GOG."""
        headers = {
            "User-Agent": DEFAULT_USER_AGENT,
            "Accept": "application/json, text/plain, */*",
            "X-Requested-With": "XMLHttpRequest",
        }

        games_result = []
        page = 1
        max_pages = 50  # Limite de segurança

        async with httpx.AsyncClient(
            headers=headers, follow_redirects=True, timeout=15.0
        ) as client:
            while page <= max_pages:
                url = f"{GOG_BASE_URL}/u/{username}/games/stats?page={page}"
                try:
                    response = await client.get(url)
                    if response.status_code == 404:
                        raise HTTPException(
                            status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"Perfil do GOG '{username}' não encontrado.",
                        )
                    if response.status_code == 403 or response.status_code == 401:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=(
                                "A biblioteca de jogos deste perfil do GOG está privada. "
                                "Por favor, acesse suas configurações de privacidade no GOG "
                                "e defina 'Perfil e Jogos' como Público."
                            ),
                        )
                    if response.status_code != 200:
                        break

                    data = response.json()
                except HTTPException:
                    raise
                except Exception as e:
                    print(f"Erro ao consultar página {page} de jogos do GOG: {e}")
                    break

                # O JSON do endpoint /games/stats pode retornar items ou pages
                items = data.get("items", []) or data.get("pages", [])
                if not items and isinstance(data, list):
                    items = data

                if not items:
                    break

                for item in items:
                    game_info = item.get("game", {}) if isinstance(item, dict) else {}
                    stats_info = item.get("stats", {}) if isinstance(item, dict) else {}

                    # Extrai dados do jogo
                    game_id = game_info.get("id") or item.get("id")
                    title = game_info.get("title") or item.get("title")
                    if not title:
                        continue

                    image_url = game_info.get("image") or item.get("image")
                    if image_url and image_url.startswith("//"):
                        image_url = f"https:{image_url}"

                    # Extrai horas jogadas (playtime vem em minutos)
                    playtime_minutes = (
                        stats_info.get("playtime")
                        if isinstance(stats_info, dict)
                        else item.get("playtime", 0)
                    ) or 0
                    hours_played = round(playtime_minutes / 60.0, 1)

                    # Extrai conquistas
                    achievements_data = (
                        stats_info.get("achievements")
                        if isinstance(stats_info, dict)
                        else item.get("achievements")
                    )
                    is_platinized = False
                    platinum_date = None

                    if isinstance(achievements_data, dict):
                        total_ach = achievements_data.get("total", 0) or 0
                        unlocked_ach = achievements_data.get("unlocked", 0) or 0
                        if total_ach > 0 and unlocked_ach >= total_ach:
                            is_platinized = True
                            # Tenta obter data da última atividade/conquista se presente
                            last_date_str = stats_info.get("last_played") or achievements_data.get(
                                "last_unlocked"
                            )
                            if last_date_str:
                                try:
                                    platinum_date = datetime.fromisoformat(
                                        last_date_str.replace("Z", "+00:00")
                                    ).date()
                                except Exception:
                                    platinum_date = datetime.now(timezone.utc).date()
                            else:
                                platinum_date = datetime.now(timezone.utc).date()

                    games_result.append(
                        {
                            "gog_id": str(game_id) if game_id else None,
                            "title": title,
                            "cover_url": image_url,
                            "hours_played": hours_played,
                            "is_platinized": is_platinized,
                            "platinum_date": platinum_date,
                        }
                    )

                total_pages = data.get("totalPages") or data.get("pages_count") or 1
                if page >= total_pages:
                    break
                page += 1

        return games_result
