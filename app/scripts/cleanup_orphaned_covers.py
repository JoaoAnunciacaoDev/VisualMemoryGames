import argparse
import logging

from app.database import SessionLocal
from app.models.game import Game
from app.models.user_game import UserGame
from app.services.storage import cleanup_orphaned_covers

logger = logging.getLogger("visualmemory.storage.cleanup")


def collect_referenced_urls() -> set[str]:
    db = SessionLocal()
    try:
        game_urls = db.query(Game.cover_url).filter(Game.cover_url.is_not(None)).all()
        custom_urls = (
            db.query(UserGame.custom_cover_url).filter(UserGame.custom_cover_url.is_not(None)).all()
        )
        return {url for (url,) in [*game_urls, *custom_urls] if url}
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Localiza capas órfãs no storage configurado.")
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Remove os objetos encontrados. Sem esta opção, executa somente dry-run.",
    )
    parser.add_argument(
        "--min-age-hours",
        type=int,
        default=24,
        help="Ignora objetos mais novos que esta quantidade de horas.",
    )
    args = parser.parse_args()

    orphaned = cleanup_orphaned_covers(
        collect_referenced_urls(),
        apply=args.apply,
        min_age_hours=args.min_age_hours,
    )
    action = "removidos" if args.apply else "encontrados"
    logger.warning("Objetos órfãos %s: %s", action, len(orphaned))
    for object_key in orphaned:
        logger.warning("%s", object_key)


if __name__ == "__main__":
    main()
