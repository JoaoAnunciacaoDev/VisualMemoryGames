import logging
import os
from typing import Dict, List, Optional

from fastapi import HTTPException
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.services.external_cache import build_cache_key, get_cached, set_cached
from app.services.game_identity import provider_ids_for_games
from app.services.http_client import request_sync
from app.services.igdb_service import (
    get_game_details_igdb,
    get_weekly_releases_igdb,
    search_games_on_igdb,
)

logger = logging.getLogger(__name__)

RAWG_API_KEY = os.getenv("RAWG_API_KEY")
BASE_URL = "https://api.rawg.io/api"


def _provider_identity(item: Dict) -> tuple[str, int] | None:
    source = str(item.get("source") or "").casefold()
    external_id = item.get("external_id")
    if source not in {"igdb", "rawg"} or external_id is None:
        return None
    return source, int(external_id)


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


def search_games_in_local_db(query: str, db: Session, limit: int = 15) -> List[Dict]:
    """Busca jogos existentes no banco local por título."""
    from app.models.game import Game
    from app.services.recommendation_service import parse_json_list

    normalized_query = query.strip().casefold()
    search_pattern = f"%{query.strip()}%"
    games = (
        db.query(Game)
        .filter(Game.title.ilike(search_pattern))
        .order_by(
            case(
                (func.lower(Game.title) == normalized_query, 0),
                (func.lower(Game.title).like(f"{normalized_query}%"), 1),
                else_=2,
            ),
            Game.title,
        )
        .limit(limit)
        .all()
    )
    provider_ids = provider_ids_for_games(db, (game.id for game in games))

    results = []
    for g in games:
        provider_identity = provider_ids.get(g.id)
        results.append(
            {
                "external_id": provider_identity[1] if provider_identity else g.external_id,
                "source": provider_identity[0] if provider_identity else "catalog",
                "title": g.title,
                "cover_url": g.cover_url,
                "release_year": g.release_year,
                "platforms": parse_json_list(g.platforms),
                "genres": parse_json_list(g.genres),
            }
        )
    return results


def search_games_on_rawg(query: str, db: Optional[Session] = None, page: int = 1) -> List[Dict]:
    """Busca jogos por nome (Cache-First DB Local -> IGDB -> RAWG) com paginação."""

    page = max(1, page)
    limit = 15
    offset = (page - 1) * limit

    # 1. Tentar Banco Local apenas na primeira página (page == 1) se o db session estiver disponível
    local_results = []
    if db is not None and page == 1:
        try:
            local_results = search_games_in_local_db(query, db, limit=limit)
        except Exception as e:
            logger.warning(f"Erro ao buscar no DB local: {e}")

    normalized_query = query.strip().casefold()
    has_complete_exact_match = any(
        item["title"].strip().casefold() == normalized_query
        and bool(item.get("cover_url"))
        and bool(item.get("genres"))
        for item in local_results
    )
    if has_complete_exact_match or len(local_results) >= limit:
        return local_results

    # 2. Tentar IGDB (Twitch API)
    igdb_results = search_games_on_igdb(query, limit=limit, offset=offset)
    if igdb_results:
        seen_titles = {r["title"].lower().strip() for r in local_results}
        seen_ids = {
            identity
            for item in local_results
            if (identity := _provider_identity(item)) is not None
        }
        combined = list(local_results)
        for r in igdb_results:
            identity = _provider_identity(r)
            r_title = r["title"].lower().strip()
            if r_title in seen_titles:
                continue
            if identity is not None and identity in seen_ids:
                continue
            seen_titles.add(r_title)
            if identity is not None:
                seen_ids.add(identity)
            combined.append(r)
        return combined

    # 3. Tentar RAWG com timeout curto (3s) se RAWG_API_KEY estiver configurado
    if RAWG_API_KEY:
        rawg_cache_key = build_cache_key(query.strip().lower(), page)
        cached = get_cached("rawg.search", rawg_cache_key)
        if cached is not None:
            cached = [{**item, "source": "rawg"} for item in cached]
            if cached:
                seen_titles = {item["title"].lower().strip() for item in local_results}
                seen_ids = {
                    identity
                    for item in local_results
                    if (identity := _provider_identity(item)) is not None
                }
                combined = list(local_results)
                for item in cached:
                    identity = _provider_identity(item)
                    item_title = item["title"].lower().strip()
                    if item_title in seen_titles or (identity is not None and identity in seen_ids):
                        continue
                    seen_titles.add(item_title)
                    if identity is not None:
                        seen_ids.add(identity)
                    combined.append(item)
                return combined
            if local_results:
                return local_results
            raise HTTPException(
                status_code=503,
                detail="Serviço de busca externa indisponível e nenhum jogo local encontrado.",
            )
        url = f"{BASE_URL}/games"
        params = {
            "key": RAWG_API_KEY,
            "search": query,
            "page_size": limit,
            "page": page,
            "search_precise": True,
        }

        try:
            response = request_sync("GET", url, params=params)
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
                        "source": "rawg",
                    }
                )

            set_cached(
                "rawg.search",
                rawg_cache_key,
                results,
                ttl_seconds=3600 if results else 300,
            )
            if results:
                seen_titles = {r["title"].lower().strip() for r in local_results}
                seen_ids = {
                    identity
                    for item in local_results
                    if (identity := _provider_identity(item)) is not None
                }
                combined = list(local_results)
                for r in results:
                    identity = _provider_identity(r)
                    r_title = r["title"].lower().strip()
                    if r_title in seen_titles:
                        continue
                    if identity is not None and identity in seen_ids:
                        continue
                    seen_titles.add(r_title)
                    if identity is not None:
                        seen_ids.add(identity)
                    combined.append(r)
                return combined
        except Exception as e:
            logger.warning(f"RAWG indisponível ou timeout na busca: {e}")

    # 4. Fallback: Se IGDB e RAWG falharam/não estão configurados, retorna os resultados locais
    if local_results:
        return local_results

    # Se nada foi encontrado e houve exceção sem ter nada local
    raise HTTPException(
        status_code=503,
        detail="Serviço de busca externa indisponível e nenhum jogo local encontrado.",
    )


def get_games_by_genres_rawg(genres: str, page_size: int = 15) -> List[Dict]:
    """Busca jogos por gêneros somente na RAWG.

    A orquestração IGDB-first pertence ao serviço consumidor. Manter esta
    função específica evita que um resultado parcial do IGDB seja confundido
    com uma resposta da RAWG e permite usar a RAWG apenas como fallback.
    """
    cache_key = build_cache_key(genres, page_size)
    cached = get_cached("rawg.genres", cache_key)
    if cached is not None:
        return [{**item, "source": "rawg"} for item in cached]

    if RAWG_API_KEY:
        url = f"{BASE_URL}/games"
        import random

        page = random.randint(1, 3)
        params = {
            "key": RAWG_API_KEY,
            "genres": genres,
            "page_size": page_size + 10,
            "ordering": "-added",
            "page": page,
        }

        try:
            response = request_sync("GET", url, params=params)
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
                        "source": "rawg",
                    }
                )
                if len(results) == page_size:
                    break
            set_cached("rawg.genres", cache_key, results, ttl_seconds=6 * 3600 if results else 300)
            return results
        except Exception as e:
            logger.warning(f"Erro ao buscar gêneros no RAWG: {e}")

    return []


def get_game_details_rawg(external_id: int, source: Optional[str] = None) -> Dict:
    """Busca detalhes expandidos de um jogo (IGDB -> RAWG)."""
    normalized_source = source.casefold() if source else None
    cache_key = build_cache_key(normalized_source or "auto", external_id)
    cached = get_cached("games.details", cache_key)
    if cached is not None:
        return cached

    # 1. IGDB é a fonte primária, exceto quando o item é explicitamente RAWG.
    if normalized_source != "rawg":
        igdb_details = get_game_details_igdb(external_id)
        if igdb_details:
            return igdb_details

    # 2. Tentar RAWG
    if RAWG_API_KEY:
        url_details = f"{BASE_URL}/games/{external_id}"
        url_movies = f"{BASE_URL}/games/{external_id}/movies"
        params = {"key": RAWG_API_KEY}

        try:
            res_details = request_sync("GET", url_details, params=params)
            res_details.raise_for_status()
            details = res_details.json()

            trailer_url = None
            try:
                res_movies = request_sync("GET", url_movies, params=params)
                if res_movies.status_code == 200:
                    movies = res_movies.json().get("results", [])
                    if movies:
                        trailer_url = movies[0].get("data", {}).get("max") or movies[0].get(
                            "data", {}
                        ).get("480")
            except Exception:
                pass

            stores = []
            try:
                res_stores = request_sync(
                    "GET", f"{BASE_URL}/games/{external_id}/stores", params=params
                )
                if res_stores.status_code == 200:
                    store_results = res_stores.json().get("results", [])
                    store_names = {}
                    for store in details.get("stores") or []:
                        store_data = store.get("store", {})
                        if "id" in store_data:
                            store_names[store_data["id"]] = store_data.get("name")
                    for store_data in store_results:
                        store_id = store_data.get("store_id")
                        store_url = store_data.get("url")
                        if store_id and store_url:
                            stores.append(
                                {
                                    "id": store_id,
                                    "name": store_names.get(store_id, "Loja"),
                                    "url": store_url,
                                }
                            )
            except Exception:
                pass

            result = {
                "synopsis": details.get("description_raw"),
                "rating": details.get("rating"),
                "trailer_url": trailer_url,
                "genres": [g["name"] for g in (details.get("genres") or [])],
                "stores": stores,
            }
            set_cached("games.details", cache_key, result, ttl_seconds=24 * 3600)
            return result
        except Exception as e:
            logger.warning(f"Erro ao buscar detalhes no RAWG: {e}")

    return {}


def get_weekly_releases_rawg(db: Optional[Session] = None) -> List[Dict]:
    """Busca os lançamentos da semana (IGDB -> RAWG -> Banco Local)."""
    from datetime import datetime, timezone

    cache_key = build_cache_key(datetime.now(timezone.utc).date().isoformat())
    cached = get_cached("games.weekly", cache_key)
    if cached is not None:
        return cached

    # 1. Tentar IGDB
    igdb_releases = get_weekly_releases_igdb()
    if igdb_releases:
        return igdb_releases

    # 2. Tentar RAWG
    if RAWG_API_KEY:
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
            response = request_sync("GET", url, params=params)
            response.raise_for_status()
            data = response.json()

            raw_items = []
            for item in data.get("results", []):
                if _is_nsfw(item):
                    continue
                released = item.get("released")
                if not released:
                    continue
                raw_items.append(item)

            filtered_items = [
                item for item in raw_items if item.get("added", 0) >= 10 or item.get("metacritic")
            ]
            if len(filtered_items) < 5:
                filtered_items = [
                    item
                    for item in raw_items
                    if item.get("added", 0) >= 2 or item.get("metacritic")
                ]
            if len(filtered_items) < 3:
                filtered_items = raw_items

            results = []
            for item in filtered_items:
                results.append(
                    {
                        "title": item["name"],
                        "cover_url": item.get("background_image"),
                        "release_date": item.get("released"),
                        "genres": [g["name"] for g in (item.get("genres") or [])],
                    }
                )

            results.sort(key=lambda x: x["release_date"])
            final_results = results[:10]
            set_cached("games.weekly", cache_key, final_results, ttl_seconds=6 * 3600)
            return final_results
        except Exception as e:
            logger.warning(f"Erro ao buscar lançamentos no RAWG: {e}")

    # 3. Fallback Banco Local (jogos mais recentes cadastrados)
    if db is not None:
        try:
            from app.models.game import Game
            from app.services.recommendation_service import parse_json_list

            recent_games = (
                db.query(Game).order_by(Game.release_year.desc().nullslast()).limit(10).all()
            )
            results = []
            for g in recent_games:
                results.append(
                    {
                        "title": g.title,
                        "cover_url": g.cover_url,
                        "release_date": str(g.release_year) if g.release_year else None,
                        "genres": parse_json_list(g.genres),
                    }
                )
            return results
        except Exception:
            pass

    return []
