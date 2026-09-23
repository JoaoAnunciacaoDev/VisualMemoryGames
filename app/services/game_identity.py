from __future__ import annotations

from typing import Iterable

from sqlalchemy.orm import Session

from app.models.game import Game
from app.models.game_provider_id import GameProviderId

SUPPORTED_GAME_PROVIDERS = {"igdb", "rawg"}
PROVIDER_PRIORITY = {"igdb": 0, "rawg": 1}


def normalize_game_provider(provider: str | None) -> str | None:
    if not provider:
        return None
    normalized = provider.strip().casefold()
    return normalized if normalized in SUPPORTED_GAME_PROVIDERS else None


def find_game_by_provider_id(
    db: Session, provider: str | None, external_id: int | str | None
) -> Game | None:
    normalized = normalize_game_provider(provider)
    if not normalized or external_id is None:
        return None
    link = (
        db.query(GameProviderId)
        .filter(
            GameProviderId.provider == normalized,
            GameProviderId.external_id == str(external_id),
        )
        .first()
    )
    return link.game if link else None


def attach_provider_id(
    db: Session,
    game: Game,
    provider: str | None,
    external_id: int | str | None,
) -> Game:
    """Vincula um ID com namespace e retorna o jogo que é dono do vínculo.

    O retorno pode ser diferente de ``game`` quando o vínculo já existe. Isso
    permite que chamadores tratem concorrência sem violar a restrição única.
    """
    normalized = normalize_game_provider(provider)
    if not normalized or external_id is None:
        return game
    existing = find_game_by_provider_id(db, normalized, external_id)
    if existing:
        return existing
    db.add(
        GameProviderId(
            game_id=game.id,
            provider=normalized,
            external_id=str(external_id),
        )
    )
    return game


def provider_ids_for_games(
    db: Session, game_ids: Iterable[str]
) -> dict[str, tuple[str, int]]:
    ids = list(game_ids)
    if not ids:
        return {}
    links = (
        db.query(GameProviderId)
        .filter(
            GameProviderId.game_id.in_(ids),
            GameProviderId.provider.in_(SUPPORTED_GAME_PROVIDERS),
        )
        .all()
    )
    result: dict[str, tuple[str, int]] = {}
    for link in sorted(links, key=lambda item: PROVIDER_PRIORITY.get(item.provider, 99)):
        try:
            external_id = int(link.external_id)
        except (TypeError, ValueError):
            continue
        result.setdefault(link.game_id, (link.provider, external_id))
    return result
