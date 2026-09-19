import { Link } from '@tanstack/react-router';
import type { Activity } from '@/features/social/queries';
import { formatDateTime } from '@/utils/date';
import styles from './Social.module.css';

function actionText(activity: Activity) {
  if (activity.action_type === 'ADDED') return 'adicionou à biblioteca';
  if (activity.action_type === 'UPDATED_STATUS') return `mudou o status para ${activity.context?.replace('_', ' ')}`;
  if (activity.action_type === 'RATED') return `avaliou com ${activity.context} estrelas`;
  if (activity.action_type === 'PLATINUM') return 'platinou';
  return 'interagiu com';
}

function ActivityHeader({ activity }: { activity: Activity }) {
  const userLink = <span className={styles.username}><Link to="/profile/$userId" params={{ userId: activity.username }}>{activity.username}</Link></span>;
  if (activity.action_type === 'FOLLOW' && activity.target_user) return <>{userLink} começou a seguir <span className={styles.targetUsername}><Link to="/profile/$userId" params={{ userId: activity.target_user.username }}>{activity.target_user.username}</Link></span></>;
  if ((activity.action_type === 'CREATED_TIERLIST' || activity.action_type === 'UPDATED_TIERLIST') && activity.tierlist_id) {
    return <>{userLink} {activity.action_type === 'CREATED_TIERLIST' ? 'criou' : 'atualizou'} a Tier List <span className={styles.tierlistLink}><Link to="/tierlists/$id" params={{ id: activity.tierlist_id }}>{activity.tierlist_title}</Link></span></>;
  }
  return <>{userLink} <span className={styles.actionText}>{actionText(activity)}</span> <span className={styles.gameTitle}>{activity.game?.title}</span></>;
}

export default function SocialActivityList({ activities, emptyMessage }: { activities: Activity[]; emptyMessage: string }) {
  if (activities.length === 0) return <p className={styles.empty}>{emptyMessage}</p>;
  return (
    <div className={styles.activityList}>
      {activities.map((activity) => (
        <article key={activity.id} className={styles.activityCard}>
          <div className={styles.actHeader}><ActivityHeader activity={activity} /></div>
          {activity.game?.cover_url && <img src={activity.game.cover_url} alt={activity.game.title} className={styles.actCover} />}
          {activity.action_type === 'RATED' && activity.commentary && (
            <blockquote className={styles.commentaryBox}><span className={styles.commentaryQuote}>“</span><p className={styles.commentaryText}>{activity.commentary}</p><span className={styles.commentaryQuote}>”</span></blockquote>
          )}
          <div className={styles.actDate}>{formatDateTime(activity.created_at)}</div>
        </article>
      ))}
    </div>
  );
}
