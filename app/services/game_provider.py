import os
from typing import Dict, List

import httpx
from fastapi import HTTPException

RAWG_API_KEY = os.getenv("RAWG_API_KEY")
BASE_URL = "https://api.rawg.io/api"


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
