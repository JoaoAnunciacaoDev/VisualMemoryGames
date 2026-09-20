import { PageTitle } from '@/components/Shared';
import type { DashboardData } from '@/features/profile/queries';
import { formatProfileDate } from './profileUtils';
import styles from './Profile.module.css';

interface ProfileHeaderProps {
  data: DashboardData;
  isOwnProfile: boolean;
  isFollowingPending: boolean;
  onFollowToggle: () => void;
  onOpenFollowers: () => void;
  onOpenFollowing: () => void;
}

export default function ProfileHeader({
  data,
  isOwnProfile,
  isFollowingPending,
  onFollowToggle,
  onOpenFollowers,
  onOpenFollowing,
}: ProfileHeaderProps) {
  return (
    <section className={styles.profileHeader}>
      <div className={styles.avatarLarge} aria-hidden="true">
        {data.username.charAt(0).toUpperCase()}
      </div>
      <div className={styles.profileInfo}>
        <div className={styles.profileTitleRow}>
          <PageTitle level="h1" className={styles.usernameTitle}>{data.username}</PageTitle>
          {!isOwnProfile && (
            <button
              type="button"
              className={`${styles.followButton} ${data.is_following ? styles.following : ''}`}
              onClick={onFollowToggle}
              disabled={isFollowingPending}
            >
              {data.is_following ? 'Seguindo' : 'Seguir'}
            </button>
          )}
        </div>
        <p className={styles.joinedText}>Membro desde {formatProfileDate(data.created_at)}</p>
        <div className={styles.followStats}>
          <button type="button" className={styles.followStatItem} onClick={onOpenFollowers}>
            <strong>{data.followers_count}</strong> seguidores
          </button>
          <button type="button" className={styles.followStatItem} onClick={onOpenFollowing}>
            <strong>{data.following_count}</strong> seguindo
          </button>
        </div>
      </div>
    </section>
  );
}
