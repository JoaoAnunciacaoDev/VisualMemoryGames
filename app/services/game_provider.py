import os
from typing import Dict, List

import httpx
from fastapi import HTTPException

RAWG_API_KEY = os.getenv("RAWG_API_KEY")
BASE_URL = "https://api.rawg.io/api"


def _is_nsfw(item: Dict) -> bool:
    forbidden_tags = {
        "nsfw",
        "hentai",
        "eroge",
        "sexual-content",
        "nudity",
        "adult",
        "sexual-themes",
    }
    tags = {t.get("slug", "").lower() for t in (item.get("tags") or [])}
    genres_slug = {g.get("slug", "").lower() for g in (item.get("genres") or [])}
    return bool(forbidden_tags.intersection(tags) or forbidden_tags.intersection(genres_slug))


def search_games_on_rawg(query: str) -> List[Dict]:
    """Busca jogos na API externa da RAWG pelo nome."""

    url = f"{BASE_URL}/games"
    params = {
        "key": RAWG_API_KEY,
        "search": query,
        "page_size": 15,
        "search_precise": True,
    }

    try:
        with httpx.Client(timeout=10) as client:
            response = client.get(url, params=params)
            response.raise_for_status()
            data = response.json()

        results = []
        for item in data.get("results", []):
            released = item.get("released")
            results.append(
                {
                    "external_id": item["id"],
                    "title": item["name"],
                    "cover_url": item.get("background_image"),
                    "release_year": int(released[:4]) if released else None,
                    "platforms": [p["platform"]["name"] for p in (item.get("platforms") or [])],
                    "genres": [g["name"] for g in (item.get("genres") or [])],
                }
            )

        return results

    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=503,
            detail=("Serviço de busca de jogos indisponível. Tente novamente mais tarde."),
        ) from e
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=503,
            detail="Não foi possível comunicar com o serviço de busca de jogos.",
        ) from e


def get_games_by_genres_rawg(genres: str, page_size: int = 15) -> List[Dict]:
    """Busca jogos na API externa da RAWG pelos gêneros."""
    url = f"{BASE_URL}/games"
    # Pede mais para caso tenhamos que filtrar
    params = {
        "key": RAWG_API_KEY,
        "genres": genres,
        "page_size": page_size + 10,
        "ordering": "-added",
    }

    try:
        with httpx.Client(timeout=10) as client:
            response = client.get(url, params=params)
            response.raise_for_status()
            data = response.json()

        results = []
        for item in data.get("results", []):
            if _is_nsfw(item):
                continue
            released = item.get("released")
            results.append(
                {
                    "external_id": item["id"],
                    "title": item["name"],
                    "cover_url": item.get("background_image"),
                    "release_year": int(released[:4]) if released else None,
                    "platforms": [p["platform"]["name"] for p in (item.get("platforms") or [])],
                    "genres": [g["name"] for g in (item.get("genres") or [])],
                }
            )
            if len(results) == page_size:
                break
        return results
    except Exception:
        return []


def get_game_details_rawg(external_id: int) -> Dict:
    """Busca os detalhes expandidos de um jogo (sinopse, nota, trailer) na RAWG."""
    url_details = f"{BASE_URL}/games/{external_id}"
    url_movies = f"{BASE_URL}/games/{external_id}/movies"
    params = {"key": RAWG_API_KEY}

    try:
        with httpx.Client(timeout=10) as client:
            res_details = client.get(url_details, params=params)
            res_details.raise_for_status()
            details = res_details.json()

            res_movies = client.get(url_movies, params=params)
            trailer_url = None
            if res_movies.status_code == 200:
                movies = res_movies.json().get("results", [])
                if movies and len(movies) > 0:
                    trailer_url = movies[0].get("data", {}).get("max") or movies[0].get(
                        "data", {}
                    ).get("480")

            res_stores = client.get(f"{BASE_URL}/games/{external_id}/stores", params=params)
            stores = []
            if res_stores.status_code == 200:
                store_results = res_stores.json().get("results", [])
                store_names = {}
                for s in details.get("stores") or []:
                    st = s.get("store", {})
                    if "id" in st:
                        store_names[st["id"]] = st.get("name")
                for st_data in store_results:
                    st_id = st_data.get("store_id")
                    url = st_data.get("url")
                    if st_id and url:
                        stores.append(
                            {"id": st_id, "name": store_names.get(st_id, "Loja"), "url": url}
                        )

            return {
                "synopsis": details.get("description_raw"),
                "rating": details.get("rating"),
                "trailer_url": trailer_url,
                "genres": [g["name"] for g in (details.get("genres") or [])],
                "stores": stores,
            }
    except Exception:
        return {}


def get_weekly_releases_rawg() -> List[Dict]:
    """Busca os lançamentos dos últimos 7 dias."""
    from datetime import datetime, timedelta

    end_date = datetime.now()
    start_date = end_date - timedelta(days=7)
    dates_str = f"{start_date.strftime('%Y-%m-%d')},{end_date.strftime('%Y-%m-%d')}"

    url = f"{BASE_URL}/games"
    params = {
        "key": RAWG_API_KEY,
        "dates": dates_str,
        "ordering": "-added",
        "page_size": 20,
    }

    try:
        with httpx.Client(timeout=10) as client:
            response = client.get(url, params=params)
            response.raise_for_status()
            data = response.json()

        results = []
        for item in data.get("results", []):
            if _is_nsfw(item):
                continue
            released = item.get("released")
            results.append(
                {
                    "title": item["name"],
                    "cover_url": item.get("background_image"),
                    "release_date": released,
                    "genres": [g["name"] for g in (item.get("genres") or [])],
                }
            )
            if len(results) == 10:
                break
        return results
    except Exception:
        return []
