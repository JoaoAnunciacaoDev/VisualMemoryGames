import logging
import os
import time
from typing import Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)

TWITCH_CLIENT_ID = os.getenv("TWITCH_CLIENT_ID") or os.getenv("IGDB_CLIENT_ID")
TWITCH_CLIENT_SECRET = os.getenv("TWITCH_CLIENT_SECRET") or os.getenv("IGDB_CLIENT_SECRET")

# Cache em memória para o Token de Acesso da Twitch
_token_cache: Dict[str, str | float] = {
    "access_token": "",
    "expires_at": 0.0,
}


def get_igdb_access_token() -> Optional[str]:
    """Obtém ou reutiliza o Token de Acesso OAuth2 da Twitch."""
    if not TWITCH_CLIENT_ID or not TWITCH_CLIENT_SECRET:
        return None

    current_time = time.time()
    # Reutiliza o token se ainda for válido (com margem de 60 segundos)
    if _token_cache["access_token"] and current_time < (float(_token_cache["expires_at"]) - 60):
        return str(_token_cache["access_token"])

    url = "https://id.twitch.tv/oauth2/token"
    params = {
        "client_id": TWITCH_CLIENT_ID,
        "client_secret": TWITCH_CLIENT_SECRET,
        "grant_type": "client_credentials",
    }

    try:
        with httpx.Client(timeout=5) as client:
            response = client.post(url, params=params)
            response.raise_for_status()
            data = response.json()

            token = data.get("access_token")
            expires_in = data.get("expires_in", 3600)

            _token_cache["access_token"] = token
            _token_cache["expires_at"] = current_time + expires_in
            return token
    except Exception as e:
        logger.error(f"Erro ao obter token do IGDB/Twitch: {e}")
        return None


def _format_cover_url(url: Optional[str]) -> Optional[str]:
    """Formata a URL de imagem do IGDB para utilizar o protocolo HTTPS e alta resolução (720p)."""
    if not url:
        return None
    if url.startswith("//"):
        url = "https:" + url
    return url.replace("t_thumb", "t_cover_big")


def _is_nsfw_igdb(item: Dict) -> bool:
    """Verifica se o jogo contém temas sexuais/eróticos (NSFW)."""
    # IGDB themes: 42 = Erotic
    themes = item.get("themes") or []
    theme_ids = [t.get("id") if isinstance(t, dict) else t for t in themes]
    if 42 in theme_ids:
        return True
    return False


def search_games_on_igdb(query: str, limit: int = 15) -> List[Dict]:
    """Busca jogos na API do IGDB pelo nome."""
    token = get_igdb_access_token()
    if not token or not TWITCH_CLIENT_ID:
        return []

    url = "https://api.igdb.com/v4/games"
    headers = {
        "Client-ID": TWITCH_CLIENT_ID,
        "Authorization": f"Bearer {token}",
    }

    # Query Apicalypse do IGDB
    sanitized_query = query.replace('"', '\\"')
    body = (
        f'search "{sanitized_query}"; '
        f"fields name, cover.url, first_release_date, platforms.name, genres.name, themes; "
        f"limit {limit};"
    )

    try:
        with httpx.Client(timeout=3) as client:
            response = client.post(url, headers=headers, content=body)
            response.raise_for_status()
            items = response.json()

        results = []
        for item in items:
            if _is_nsfw_igdb(item):
                continue

            release_date = item.get("first_release_date")
            release_year = None
            if release_date:
                from datetime import datetime, timezone

                release_year = datetime.fromtimestamp(release_date, tz=timezone.utc).year

            cover_raw = (
                item.get("cover", {}).get("url") if isinstance(item.get("cover"), dict) else None
            )

            platforms = []
            if isinstance(item.get("platforms"), list):
                platforms = [
                    p.get("name")
                    for p in item["platforms"]
                    if isinstance(p, dict) and p.get("name")
                ]

            genres = []
            if isinstance(item.get("genres"), list):
                genres = [
                    g.get("name") for g in item["genres"] if isinstance(g, dict) and g.get("name")
                ]

            results.append(
                {
                    "external_id": item["id"],
                    "title": item["name"],
                    "cover_url": _format_cover_url(cover_raw),
                    "release_year": release_year,
                    "platforms": platforms,
                    "genres": genres,
                }
            )

        return results
    except Exception as e:
        logger.error(f"Erro ao pesquisar no IGDB: {e}")
        return []


def get_games_by_genres_igdb(genres: List[str], page_size: int = 15) -> List[Dict]:
    """Busca jogos no IGDB por gêneros."""
    token = get_igdb_access_token()
    if not token or not TWITCH_CLIENT_ID or not genres:
        return []

    url = "https://api.igdb.com/v4/games"
    headers = {
        "Client-ID": TWITCH_CLIENT_ID,
        "Authorization": f"Bearer {token}",
    }

    # Prepara filtro de gêneros
    genre_conditions = ", ".join([f'genres.name = "{g}"' for g in genres])
    body = (
        f"fields name, cover.url, first_release_date, platforms.name, genres.name, rating, themes; "
        f"where ({genre_conditions}) & rating != null; "
        f"sort rating desc; "
        f"limit {page_size};"
    )

    try:
        with httpx.Client(timeout=3) as client:
            response = client.post(url, headers=headers, content=body)
            response.raise_for_status()
            items = response.json()

        results = []
        for item in items:
            if _is_nsfw_igdb(item):
                continue
            release_date = item.get("first_release_date")
            release_year = None
            if release_date:
                from datetime import datetime, timezone

                release_year = datetime.fromtimestamp(release_date, tz=timezone.utc).year

            cover_raw = (
                item.get("cover", {}).get("url") if isinstance(item.get("cover"), dict) else None
            )

            platforms = []
            if isinstance(item.get("platforms"), list):
                platforms = [
                    p.get("name")
                    for p in item["platforms"]
                    if isinstance(p, dict) and p.get("name")
                ]

            item_genres = []
            if isinstance(item.get("genres"), list):
                item_genres = [
                    g.get("name") for g in item["genres"] if isinstance(g, dict) and g.get("name")
                ]

            results.append(
                {
                    "external_id": item["id"],
                    "title": item["name"],
                    "cover_url": _format_cover_url(cover_raw),
                    "release_year": release_year,
                    "platforms": platforms,
                    "genres": item_genres,
                }
            )

        return results
    except Exception as e:
        logger.error(f"Erro ao buscar por gêneros no IGDB: {e}")
        return []


def get_game_details_igdb(external_id: int) -> Dict:
    """Busca os detalhes expandidos de um jogo (sinopse, nota, vídeos, lojas) no IGDB."""
    token = get_igdb_access_token()
    if not token or not TWITCH_CLIENT_ID:
        return {}

    url = "https://api.igdb.com/v4/games"
    headers = {
        "Client-ID": TWITCH_CLIENT_ID,
        "Authorization": f"Bearer {token}",
    }

    body = (
        "fields name, summary, rating, genres.name, videos.video_id, "
        "websites.url, websites.category; "
        f"where id = {external_id};"
    )

    try:
        with httpx.Client(timeout=3) as client:
            response = client.post(url, headers=headers, content=body)
            response.raise_for_status()
            items = response.json()

        if not items:
            return {}

        details = items[0]

        # Trailer URL via YouTube ID se disponível
        trailer_url = None
        videos = details.get("videos") or []
        if videos and isinstance(videos, list):
            first_video = videos[0]
            if isinstance(first_video, dict) and first_video.get("video_id"):
                trailer_url = f"https://www.youtube.com/watch?v={first_video['video_id']}"

        # Lojas (websites)
        stores = []
        websites = details.get("websites") or []
        if isinstance(websites, list):
            for w in websites:
                if isinstance(w, dict) and w.get("url"):
                    stores.append(
                        {"id": w.get("id", 0), "name": "Loja / Site Oficial", "url": w["url"]}
                    )

        genres = []
        if isinstance(details.get("genres"), list):
            genres = [
                g.get("name") for g in details["genres"] if isinstance(g, dict) and g.get("name")
            ]

        rating = details.get("rating")
        if rating:
            rating = round(rating / 20.0, 1)  # Converte de 0-100 para 0-5.0 estilo RAWG

        return {
            "synopsis": details.get("summary"),
            "rating": rating,
            "trailer_url": trailer_url,
            "genres": genres,
            "stores": stores,
        }
    except Exception as e:
        logger.error(f"Erro ao buscar detalhes no IGDB: {e}")
        return {}


def get_weekly_releases_igdb() -> List[Dict]:
    """Busca os lançamentos dos últimos 7 dias no IGDB."""
    token = get_igdb_access_token()
    if not token or not TWITCH_CLIENT_ID:
        return []

    from datetime import datetime, timedelta, timezone

    now = datetime.now(timezone.utc)
    start_ts = int((now - timedelta(days=7)).timestamp())
    end_ts = int(now.timestamp())

    url = "https://api.igdb.com/v4/games"
    headers = {
        "Client-ID": TWITCH_CLIENT_ID,
        "Authorization": f"Bearer {token}",
    }

    body = (
        f"fields name, cover.url, first_release_date, genres.name, themes; "
        f"where first_release_date >= {start_ts} & first_release_date <= {end_ts}; "
        f"sort first_release_date asc; "
        f"limit 20;"
    )

    try:
        with httpx.Client(timeout=3) as client:
            response = client.post(url, headers=headers, content=body)
            response.raise_for_status()
            items = response.json()

        results = []
        for item in items:
            if _is_nsfw_igdb(item):
                continue
            rel_ts = item.get("first_release_date")
            rel_date_str = None
            if rel_ts:
                rel_date_str = datetime.fromtimestamp(rel_ts, tz=timezone.utc).strftime("%Y-%m-%d")

            cover_raw = (
                item.get("cover", {}).get("url") if isinstance(item.get("cover"), dict) else None
            )

            genres = []
            if isinstance(item.get("genres"), list):
                genres = [
                    g.get("name") for g in item["genres"] if isinstance(g, dict) and g.get("name")
                ]

            results.append(
                {
                    "title": item["name"],
                    "cover_url": _format_cover_url(cover_raw),
                    "release_date": rel_date_str,
                    "genres": genres,
                }
            )

        return results[:10]
    except Exception as e:
        logger.error(f"Erro ao buscar lançamentos semanais no IGDB: {e}")
        return []
