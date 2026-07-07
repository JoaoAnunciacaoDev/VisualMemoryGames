from sqlalchemy.orm import Session

from app.models.tierlist import TierCategory, TierList
from app.models.user_game import UserGame


def create_default_categories(tierlist_id: str, db: Session) -> None:
    """Semeia o pool e os 5 slots padrão (S/A/B/C/D) numa nova Tier List."""
    pool_category = TierCategory(
        tierlist_id=tierlist_id, name="__pool__", color="#cccccc", order_index=-1
    )
    db.add(pool_category)

    default_categories = [
        {"name": "S", "color": "#ff7f7f"},
        {"name": "A", "color": "#ffbf7f"},
        {"name": "B", "color": "#ffff7f"},
        {"name": "C", "color": "#7fff7f"},
        {"name": "D", "color": "#7fbfff"},
    ]

    for index, cat in enumerate(default_categories):
        category = TierCategory(
            tierlist_id=tierlist_id,
            name=cat["name"],
            color=cat["color"],
            order_index=index,
        )
        db.add(category)

    db.commit()


def enrich_tierlist_with_custom_covers(tierlist: TierList, db: Session) -> None:
    """Injeta custom_cover_url nos itens da tier list a partir dos dados de UserGame."""
    user_games_data = (
        db.query(UserGame.game_id, UserGame.custom_cover_url)
        .filter(UserGame.user_id == tierlist.user_id)
        .all()
    )

    custom_covers = {
        game_id: custom_cover_url
        for game_id, custom_cover_url in user_games_data
        if custom_cover_url is not None and str(custom_cover_url).strip() != ""
    }

    for category in tierlist.categories:
        for item in category.items:
            if item.game and item.game.id in custom_covers:
                setattr(item.game, "custom_cover_url", custom_covers[item.game.id])
