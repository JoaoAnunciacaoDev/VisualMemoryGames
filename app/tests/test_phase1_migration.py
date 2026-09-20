import importlib.util
from pathlib import Path

import sqlalchemy as sa


def test_consolidate_duplicate_user_games_preserves_data_and_reviews():
    migration_path = (
        Path(__file__).parents[2]
        / "alembic"
        / "versions"
        / "d3b7f91e2a4c_align_schema_and_add_query_indexes.py"
    )
    spec = importlib.util.spec_from_file_location("phase1_migration", migration_path)
    assert spec and spec.loader
    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)
    engine = sa.create_engine("sqlite:///:memory:")
    metadata = sa.MetaData()
    user_games = sa.Table(
        "user_games",
        metadata,
        sa.Column("id", sa.String, primary_key=True),
        sa.Column("user_id", sa.String, nullable=False),
        sa.Column("game_id", sa.String, nullable=False),
        sa.Column("rating", sa.Float),
        sa.Column("status", sa.String, nullable=False),
        sa.Column("started_at", sa.Date),
        sa.Column("finished_at", sa.Date),
        sa.Column("acquired_at", sa.Date),
        sa.Column("platinum_at", sa.Date),
        sa.Column("hours_played", sa.Float),
        sa.Column("store", sa.String),
        sa.Column("custom_cover_url", sa.String),
        sa.Column("notes", sa.Text),
        sa.Column("favorite", sa.Boolean),
    )
    reviews = sa.Table(
        "user_game_reviews",
        metadata,
        sa.Column("id", sa.String, primary_key=True),
        sa.Column("user_game_id", sa.String, nullable=False),
    )
    metadata.create_all(engine)

    with engine.begin() as connection:
        connection.execute(
            user_games.insert(),
            [
                {
                    "id": "a-survivor",
                    "user_id": "user-1",
                    "game_id": "game-1",
                    "rating": None,
                    "status": "Na biblioteca",
                    "started_at": None,
                    "finished_at": None,
                    "acquired_at": None,
                    "platinum_at": None,
                    "hours_played": 2,
                    "store": None,
                    "custom_cover_url": None,
                    "notes": "curta",
                    "favorite": False,
                },
                {
                    "id": "b-duplicate",
                    "user_id": "user-1",
                    "game_id": "game-1",
                    "rating": 9,
                    "status": "Platinado",
                    "started_at": None,
                    "finished_at": None,
                    "acquired_at": None,
                    "platinum_at": None,
                    "hours_played": 30,
                    "store": "STEAM",
                    "custom_cover_url": None,
                    "notes": "avaliação mais completa",
                    "favorite": True,
                },
            ],
        )
        connection.execute(reviews.insert(), {"id": "review-1", "user_game_id": "b-duplicate"})

        migration._consolidate_duplicate_user_games(connection)

        rows = connection.execute(sa.select(user_games)).mappings().all()
        assert len(rows) == 1
        assert rows[0]["id"] == "a-survivor"
        assert rows[0]["rating"] == 9
        assert rows[0]["status"] == "Platinado"
        assert rows[0]["hours_played"] == 30
        assert rows[0]["store"] == "STEAM"
        assert rows[0]["notes"] == "avaliação mais completa"
        assert rows[0]["favorite"] is True

        review = connection.execute(sa.select(reviews)).mappings().one()
        assert review["user_game_id"] == "a-survivor"
