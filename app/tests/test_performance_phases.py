from sqlalchemy import event

from app.models.follow import Follow
from app.models.game import Game
from app.models.game_provider_id import GameProviderId
from app.models.itch_account import ItchAccount
from app.models.user import User
from app.models.user_game import UserGame
from app.routers.itch import _persist_itch_games
from app.services import social_service


def _count_selects(engine, operation):
    statements = []

    def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        if statement.lstrip().upper().startswith("SELECT"):
            statements.append(statement)

    event.listen(engine, "before_cursor_execute", before_cursor_execute)
    try:
        result = operation()
    finally:
        event.remove(engine, "before_cursor_execute", before_cursor_execute)
    return result, len(statements)


def test_social_search_and_followers_use_constant_query_count(db_session, auth_headers):
    current_user = db_session.query(User).filter(User.username == "tester").one()
    users = [
        User(
            username=f"public-{index}",
            email=f"public-{index}@example.com",
            password_hash="hash",
            is_public=True,
        )
        for index in range(12)
    ]
    db_session.add_all(users)
    db_session.flush()
    db_session.add_all(
        [Follow(follower_id=user.id, following_id=current_user.id) for user in users]
    )
    db_session.commit()
    db_session.refresh(current_user)

    search_results, search_queries = _count_selects(
        db_session.bind,
        lambda: social_service.search_users("public-", current_user, db_session),
    )
    follower_results, follower_queries = _count_selects(
        db_session.bind,
        lambda: social_service.get_followers(current_user.id, current_user, db_session, limit=50),
    )

    assert len(search_results) == 12
    assert search_queries == 1
    assert len(follower_results) == 12
    assert follower_queries == 2


def test_library_endpoint_is_bounded_and_supports_next_page(client, auth_headers, db_session):
    user = db_session.query(User).filter(User.username == "tester").one()
    games = [Game(title=f"Paged Game {index}") for index in range(55)]
    db_session.add_all(games)
    db_session.flush()
    db_session.add_all(
        [UserGame(user_id=user.id, game_id=game.id, status="Na biblioteca") for game in games]
    )
    db_session.commit()

    first_page = client.get("/user-games/me", headers=auth_headers)
    second_page = client.get("/user-games/me?offset=50&limit=50", headers=auth_headers)

    assert first_page.status_code == 200
    assert len(first_page.json()) == 50
    assert second_page.status_code == 200
    assert len(second_page.json()) == 5


def test_itch_sync_batches_writes_and_namespaces_external_ids(db_session, auth_headers):
    user = db_session.query(User).filter(User.username == "tester").one()
    conflicting_game = Game(title="Different Provider Game", external_id=123)
    account = ItchAccount(
        user_id=user.id,
        itch_id="itch-user",
        username="itch-user",
        access_token="secret-token",
    )
    db_session.add_all([conflicting_game, account])
    db_session.commit()

    result = _persist_itch_games(
        account,
        [
            {"game": {"id": 123, "title": "Itch Game", "cover_url": None}},
            {"game": {"id": 456, "title": "Another Itch Game", "cover_url": None}},
            {"game": {"id": 123, "title": "Itch Game", "cover_url": None}},
        ],
        db_session,
    )

    links = db_session.query(GameProviderId).filter(GameProviderId.provider == "ITCH").all()
    itch_game = next(link.game for link in links if link.external_id == "123")
    assert result == {"new_games_count": 2, "updated_games_count": 0}
    assert len(links) == 2
    assert itch_game.id != conflicting_game.id
    assert itch_game.external_id is None
