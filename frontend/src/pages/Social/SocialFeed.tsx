import { Loader } from '@/components/Shared';
import type { Activity, RawgRelease } from '@/features/social/queries';
import { formatDate } from '@/utils/date';
import SocialActivityList from './SocialActivityList';
import { PeriodFilters, SocialPagination } from './SocialControls';
import styles from './Social.module.css';

export default function SocialFeed({
  title, activities, releases, emptyMessage, loading, month, year, page, totalPages,
  onPeriodChange, onPageChange,
}: {
  title: string;
  activities: Activity[];
  releases?: RawgRelease[];
  emptyMessage: string;
  loading: boolean;
  month: number;
  year: number;
  page: number;
  totalPages: number;
  onPeriodChange: (value: { month?: number; year?: number }) => void;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className={releases ? styles.feedLayout : styles.myActivitiesLayout}>
      <div className={styles.mainFeed}>
        <div className={styles.feedHeaderRow}>
          <h2>{title}</h2>
          <PeriodFilters month={month} year={year} disabled={loading} onChange={onPeriodChange} />
        </div>
        {loading ? <Loader message={`Carregando ${title === 'Atividades Recentes' ? 'feed' : 'minhas atividades'}...`} /> : (
          <>
            <SocialActivityList activities={activities} emptyMessage={emptyMessage} />
            <SocialPagination currentPage={page} totalPages={totalPages} onChange={onPageChange} />
          </>
        )}
      </div>
      {releases && (
        <aside className={styles.sidebarFeed}>
          <h2>Lançamentos da Semana</h2>
          {releases.map((release, index) => (
            <article key={`${release.title}-${index}`} className={styles.releaseCard}>
              {release.cover_url && <img src={release.cover_url} alt={release.title} className={styles.releaseCover} />}
              <div className={styles.releaseInfo}><h4>{release.title}</h4><p>{formatDate(release.release_date)}</p><p className={styles.releaseGenres}>{release.genres.slice(0, 3).join(', ')}</p></div>
            </article>
          ))}
        </aside>
      )}
    </div>
  );
}
