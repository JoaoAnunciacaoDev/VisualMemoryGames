"""align schema and add query indexes

Revision ID: d3b7f91e2a4c
Revises: a89d3f124b10
Create Date: 2026-09-20 12:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "d3b7f91e2a4c"
down_revision: str | Sequence[str] | None = "a89d3f124b10"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _consolidate_duplicate_user_games(connection: sa.Connection) -> None:
    """Mescla duplicatas antes de criar a restrição única de usuário/jogo."""
    metadata = sa.MetaData()
    user_games = sa.Table("user_games", metadata, autoload_with=connection)
    reviews = sa.Table("user_game_reviews", metadata, autoload_with=connection)

    duplicate_groups = list(
        connection.execute(
            sa.select(user_games.c.user_id, user_games.c.game_id)
            .group_by(user_games.c.user_id, user_games.c.game_id)
            .having(sa.func.count(user_games.c.id) > 1)
        ).mappings()
    )

    nullable_fields = (
        "rating",
        "started_at",
        "finished_at",
        "acquired_at",
        "platinum_at",
        "store",
        "custom_cover_url",
    )

    for group in duplicate_groups:
        rows = list(
            connection.execute(
                sa.select(user_games)
                .where(
                    user_games.c.user_id == group["user_id"],
                    user_games.c.game_id == group["game_id"],
                )
                .order_by(user_games.c.id)
            ).mappings()
        )
        survivor = rows[0]
        duplicate_ids = [row["id"] for row in rows[1:]]

        merged: dict[str, object] = {}
        for field in nullable_fields:
            merged[field] = next(
                (row[field] for row in rows if row[field] is not None),
                None,
            )

        meaningful_status = next(
            (
                row["status"]
                for row in rows
                if row["status"] and row["status"] != "Na biblioteca"
            ),
            None,
        )
        merged["status"] = meaningful_status or survivor["status"] or "Na biblioteca"
        merged["favorite"] = any(bool(row["favorite"]) for row in rows)

        hours = [row["hours_played"] for row in rows if row["hours_played"] is not None]
        merged["hours_played"] = max(hours) if hours else None

        notes = [row["notes"] for row in rows if row["notes"]]
        merged["notes"] = max(notes, key=len) if notes else None

        connection.execute(
            reviews.update()
            .where(reviews.c.user_game_id.in_(duplicate_ids))
            .values(user_game_id=survivor["id"])
        )
        connection.execute(user_games.delete().where(user_games.c.id.in_(duplicate_ids)))
        connection.execute(
            user_games.update().where(user_games.c.id == survivor["id"]).values(**merged)
        )


def upgrade() -> None:
    connection = op.get_bind()
    _consolidate_duplicate_user_games(connection)

    op.execute(sa.text("UPDATE user_games SET favorite = false WHERE favorite IS NULL"))
    with op.batch_alter_table("user_games", schema=None) as batch_op:
        batch_op.alter_column(
            "favorite",
            existing_type=sa.Boolean(),
            existing_nullable=True,
            nullable=False,
        )

    op.create_index("ix_custom_lists_user_id", "custom_lists", ["user_id"], unique=False)
    op.create_index("ix_steam_accounts_steam_id", "steam_accounts", ["steam_id"], unique=False)
    op.create_index("ix_steam_accounts_user_id", "steam_accounts", ["user_id"], unique=False)
    op.create_index(
        "ix_tier_categories_tierlist_id", "tier_categories", ["tierlist_id"], unique=False
    )
    op.create_index("ix_tier_items_category_id", "tier_items", ["category_id"], unique=False)
    op.create_index("ix_tierlists_user_id", "tierlists", ["user_id"], unique=False)
    op.create_index("ix_user_games_game_id", "user_games", ["game_id"], unique=False)
    op.create_index(
        "ix_user_games_user_game", "user_games", ["user_id", "game_id"], unique=True
    )
    op.create_index("ix_user_games_user_id", "user_games", ["user_id"], unique=False)

    op.create_index(
        "ix_activities_user_created_at",
        "activities",
        ["user_id", "created_at"],
        unique=False,
    )
    op.create_index("ix_follows_following_id", "follows", ["following_id"], unique=False)
    op.create_index("ix_patch_notes_created_at", "patch_notes", ["created_at"], unique=False)
    op.create_index("ix_itch_accounts_user_id", "itch_accounts", ["user_id"], unique=False)
    op.create_index(
        "ix_user_games_user_store", "user_games", ["user_id", "store"], unique=False
    )


def downgrade() -> None:
    op.drop_index("ix_user_games_user_store", table_name="user_games")
    op.drop_index("ix_itch_accounts_user_id", table_name="itch_accounts")
    op.drop_index("ix_patch_notes_created_at", table_name="patch_notes")
    op.drop_index("ix_follows_following_id", table_name="follows")
    op.drop_index("ix_activities_user_created_at", table_name="activities")

    op.drop_index("ix_user_games_user_id", table_name="user_games")
    op.drop_index("ix_user_games_user_game", table_name="user_games")
    op.drop_index("ix_user_games_game_id", table_name="user_games")
    op.drop_index("ix_tierlists_user_id", table_name="tierlists")
    op.drop_index("ix_tier_items_category_id", table_name="tier_items")
    op.drop_index("ix_tier_categories_tierlist_id", table_name="tier_categories")
    op.drop_index("ix_steam_accounts_user_id", table_name="steam_accounts")
    op.drop_index("ix_steam_accounts_steam_id", table_name="steam_accounts")
    op.drop_index("ix_custom_lists_user_id", table_name="custom_lists")

    with op.batch_alter_table("user_games", schema=None) as batch_op:
        batch_op.alter_column(
            "favorite",
            existing_type=sa.Boolean(),
            existing_nullable=False,
            nullable=True,
        )
