import os
import requests
from typing import List, Dict


RAWG_API_KEY = os.getenv("RAWG_API_KEY")
BASE_URL = "https://api.rawg.io/api"


def search_games_on_rawg(query: str) -> List[Dict]:
    """Busca jogos na API externa da RAWG pelo nome."""
    
    url = f"{BASE_URL}/games"
    params = {
        "key": RAWG_API_KEY,
        "search": query,
        "page_size": 15
    }
    
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        
        results = []
        for item in data.get("results", []):
            released = item.get("released")
            results.append({
                "external_id": item["id"],
                "title": item["name"],
                "cover_url": item.get("background_image"),
                "release_year": int(released[:4]) if released else None,
                "platforms": [p["platform"]["name"] for p in item.get("platforms", [])],
                "genres": [g["name"] for g in item.get("genres", [])], 
            })
            
        return results
        
    except requests.exceptions.RequestException as e:
        print(f"Erro ao comunicar com a RAWG: {e}")
        return []