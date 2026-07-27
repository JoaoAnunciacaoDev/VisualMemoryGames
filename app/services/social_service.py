from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.activity import Activity
from app.models.follow import Follow
from app.models.user import User
from app.schemas.game import GameResponse
from app.schemas.social import ActivityResponse, FeedResponse, RawgRelease, UserPublicProfile
from app.services.game_provider import get_weekly_releases_rawg
from app.utils import safe_load_json_list


def search_users(query: str, current_user: User, db: Session) -> List[UserPublicProfile]:
    """Busca usuários públicos pelo nome."""
    users = (
        db.query(User)
        .filter(User.is_public, User.id != current_user.id, User.username.ilike(f"%{query}%"))
        .limit(20)
        .all()
    )

    results = []
    for u in users:
        followers_count = db.query(Follow).filter(Follow.following_id == u.id).count()
        following_count = db.query(Follow).filter(Follow.follower_id == u.id).count()

        is_following = (
            db.query(Follow)
            .filter(Follow.follower_id == current_user.id, Follow.following_id == u.id)
            .first()
            is not None
        )

        results.append(
            UserPublicProfile(
                id=u.id,
                username=u.username,
                is_public=u.is_public,
                followers_count=followers_count,
                following_count=following_count,
                is_following=is_following,
            )
        )

    return results


def get_user_profile(user_id: str, current_user: User, db: Session) -> UserPublicProfile:
    """Busca o perfil de um usuário, permitindo se for público, se eu sigo, ou se eu sou admin."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None

    # Verifica permissão
    is_following = (
        db.query(Follow)
        .filter(Follow.follower_id == current_user.id, Follow.following_id == user.id)
        .first()
        is not None
    )

    if (
        not user.is_public
        and not current_user.is_admin
        and not is_following
        and user.id != current_user.id
    ):
        return None  # Acesso negado

    followers_count = db.query(Follow).filter(Follow.following_id == user.id).count()
    following_count = db.query(Follow).filter(Follow.follower_id == user.id).count()

    return UserPublicProfile(
        id=user.id,
        username=user.username,
        is_public=user.is_public,
        followers_count=followers_count,
        following_count=following_count,
        is_following=is_following,
    )


def get_followers(user_id: str, current_user: User, db: Session) -> List[UserPublicProfile]:
    # Verificar acesso ao perfil primeiro
    profile = get_user_profile(user_id, current_user, db)
    if not profile:
        return []

    followers = db.query(Follow).filter(Follow.following_id == user_id).all()
    results = []
    for f in followers:
        u = db.query(User).filter(User.id == f.follower_id).first()
        if not u:
            continue
        followers_count = db.query(Follow).filter(Follow.following_id == u.id).count()
        following_count = db.query(Follow).filter(Follow.follower_id == u.id).count()
        is_following = (
            db.query(Follow)
            .filter(Follow.follower_id == current_user.id, Follow.following_id == u.id)
            .first()
            is not None
        )

        results.append(
            UserPublicProfile(
                id=u.id,
                username=u.username,
                is_public=u.is_public,
                followers_count=followers_count,
                following_count=following_count,
                is_following=is_following,
            )
        )
    return results


def get_following(user_id: str, current_user: User, db: Session) -> List[UserPublicProfile]:
    # Verificar acesso ao perfil primeiro
    profile = get_user_profile(user_id, current_user, db)
    if not profile:
        return []

    following = db.query(Follow).filter(Follow.follower_id == user_id).all()
    results = []
    for f in following:
        u = db.query(User).filter(User.id == f.following_id).first()
        if not u:
            continue
        followers_count = db.query(Follow).filter(Follow.following_id == u.id).count()
        following_count = db.query(Follow).filter(Follow.follower_id == u.id).count()
        is_following = (
            db.query(Follow)
            .filter(Follow.follower_id == current_user.id, Follow.following_id == u.id)
            .first()
            is not None
        )

        results.append(
            UserPublicProfile(
                id=u.id,
                username=u.username,
                is_public=u.is_public,
                followers_count=followers_count,
                following_count=following_count,
                is_following=is_following,
            )
        )
    return results


def follow_user(user_id: str, current_user: User, db: Session) -> bool:
    """Segue um usuário público."""
    if str(user_id) == str(current_user.id):
        return False

    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        return False

    # Pode seguir se for público ou admin
    if not target_user.is_public and not current_user.is_admin:
        return False

    existing = (
        db.query(Follow)
        .filter(Follow.follower_id == current_user.id, Follow.following_id == user_id)
        .first()
    )

    if not existing:
        follow = Follow(follower_id=current_user.id, following_id=user_id)
        db.add(follow)

        # Gerar atividade de seguimento
        activity = Activity(
            user_id=str(current_user.id),
            game_id=None,
            action_type="FOLLOW",
            target_user_id=str(user_id)
        )
        db.add(activity)
        db.commit()
    return True


def unfollow_user(user_id: str, current_user: User, db: Session) -> bool:
    """Deixa de seguir um usuário."""
    existing = (
        db.query(Follow)
        .filter(Follow.follower_id == current_user.id, Follow.following_id == user_id)
        .first()
    )

    if existing:
        db.delete(existing)
        # Deleta atividades de seguimento correspondentes
        db.query(Activity).filter(
            Activity.user_id == current_user.id,
            Activity.target_user_id == user_id,
            Activity.action_type == "FOLLOW"
        ).delete(synchronize_session=False)
        db.commit()
    return True


def format_activities(
    raw_activities: List[Activity], db: Session, current_user: User
) -> List[ActivityResponse]:
    import json

    from app.models.user_game import UserGame

    # Pre-fetch user games for games mentioned in activities
    user_game_keys = {(act.user_id, act.game_id) for act in raw_activities if act.game_id}

    user_games_map = {}
    if user_game_keys:
        user_ids = {u_id for u_id, g_id in user_game_keys}
        game_ids = {g_id for u_id, g_id in user_game_keys}
        ugs = (
            db.query(UserGame)
            .filter(UserGame.user_id.in_(user_ids), UserGame.game_id.in_(game_ids))
            .all()
        )
        user_games_map = {(ug.user_id, ug.game_id): ug for ug in ugs}

    activities_res = []
    for act in raw_activities:
        game_res = None
        if act.game_id and act.game:
            ug = user_games_map.get((act.user_id, act.game_id))
            cover_url = ug.custom_cover_url if (ug and ug.custom_cover_url) else act.game.cover_url
            game_res = GameResponse(
                id=act.game.id,
                external_id=act.game.external_id,
                title=act.game.title,
                cover_url=cover_url,
                release_year=act.game.release_year,
                platforms=safe_load_json_list(act.game.platforms),
                genres=safe_load_json_list(act.game.genres),
            )

        target_user_res = None
        if act.target_user_id and act.target_user:
            target_user_res = get_user_profile(str(act.target_user_id), current_user, db)

        tierlist_id = str(act.tierlist_id) if act.tierlist_id else None
        tierlist_title = act.tierlist.title if (act.tierlist_id and act.tierlist) else None

        commentary = None
        context_val = act.context
        if act.action_type == "RATED" and context_val:
            if "{" in context_val:
                try:
                    parsed = json.loads(context_val)
                    if isinstance(parsed, dict):
                        context_val = str(parsed.get("rating"))
                        commentary = parsed.get("notes")
                except Exception:
                    pass

        activities_res.append(
            ActivityResponse(
                id=act.id,
                user_id=act.user.id,
                username=act.user.username,
                game=game_res,
                action_type=act.action_type,
                context=context_val,
                created_at=act.created_at,
                target_user=target_user_res,
                tierlist_id=tierlist_id,
                tierlist_title=tierlist_title,
                commentary=commentary,
            )
        )
    return activities_res


def get_my_activities(
    current_user: User,
    db: Session,
    year: Optional[int] = None,
    month: Optional[int] = None,
) -> List[ActivityResponse]:
    """Busca as atividades do próprio usuário logado com filtro opcional de ano e mês."""
    from datetime import datetime, timezone

    now = datetime.now(timezone.utc)
    target_year = year if year is not None else now.year
    target_month = month if month is not None else now.month

    start_date = datetime(target_year, target_month, 1, tzinfo=timezone.utc)
    if target_month == 12:
        end_date = datetime(target_year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        end_date = datetime(target_year, target_month + 1, 1, tzinfo=timezone.utc)

    raw_activities = (
        db.query(Activity)
        .filter(
            Activity.user_id == current_user.id,
            Activity.created_at >= start_date,
            Activity.created_at < end_date,
        )
        .order_by(Activity.created_at.desc())
        .all()
    )
    return format_activities(raw_activities, db, current_user)


def get_feed(
    current_user: User,
    db: Session,
    year: Optional[int] = None,
    month: Optional[int] = None,
) -> FeedResponse:
    """Busca as atividades dos usuários que eu sigo + lançamentos da semana."""

    # 1. Obter IDs que eu sigo
    following_ids = [
        f.following_id for f in db.query(Follow).filter(Follow.follower_id == current_user.id).all()
    ]

    # 2. Buscar atividades recentes
    activities = []
    if following_ids:
        from datetime import datetime, timezone

        now = datetime.now(timezone.utc)
        target_year = year if year is not None else now.year
        target_month = month if month is not None else now.month

        start_date = datetime(target_year, target_month, 1, tzinfo=timezone.utc)
        if target_month == 12:
            end_date = datetime(target_year + 1, 1, 1, tzinfo=timezone.utc)
        else:
            end_date = datetime(target_year, target_month + 1, 1, tzinfo=timezone.utc)

        raw_activities = (
            db.query(Activity)
            .filter(
                Activity.user_id.in_(following_ids),
                Activity.created_at >= start_date,
                Activity.created_at < end_date,
            )
            .order_by(Activity.created_at.desc())
            .all()
        )

        activities = format_activities(raw_activities, db, current_user)

    # 3. Buscar lançamentos do RAWG
    rawg_games = get_weekly_releases_rawg()
    rawg_releases = [RawgRelease(**g) for g in rawg_games]

    return FeedResponse(activities=activities, rawg_releases=rawg_releases)
