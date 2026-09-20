import { Gamepad2, HelpCircle, RefreshCw } from 'lucide-react';
import { Button, Card } from '@/components/Shared';
import type { DashboardData } from '@/features/profile/queries';
import { getStoreLabel } from '@/types/enums';
import { translateGenre } from '@/utils/genres';
import { STATUS_COLORS, STORE_COLORS } from './profileUtils';
import styles from './Profile.module.css';

function Distribution({
  title,
  values,
  total,
  emptyMessage,
  labelFor = (value) => value,
  colorFor,
}: {
  title: string;
  values: Record<string, number>;
  total: number;
  emptyMessage: string;
  labelFor?: (value: string) => string;
  colorFor: (value: string) => string;
}) {
  return (
    <Card className={styles.detailsCard}>
      <h3 className={styles.cardTitle}>{title}</h3>
      <div className={styles.statusList}>
        {Object.entries(values).sort((a, b) => b[1] - a[1]).map(([key, count]) => {
          const percentage = total === 0 ? 0 : Math.round((count / total) * 100);
          return (
            <div key={key} className={styles.statusItem}>
              <div className={styles.statusMeta}>
                <span className={styles.statusName}>{labelFor(key)}</span>
                <span className={styles.statusCount}>{count} ({percentage}%)</span>
              </div>
              <div className={styles.progressBarBg}>
                <div
                  className={styles.progressBarFill}
                  style={{ width: `${percentage}%`, backgroundColor: colorFor(key) }}
                />
              </div>
            </div>
          );
        })}
        {Object.keys(values).length === 0 && <p className={styles.emptyText}>{emptyMessage}</p>}
      </div>
    </Card>
  );
}

export default function ProfileOverview({ data, onOpenGenres }: {
  data: DashboardData;
  onOpenGenres: () => void;
}) {
  const stats = [
    [data.games_count, 'Jogos na Biblioteca'],
    [data.lists_count, 'Listas Criadas'],
    [data.tierlists_count, 'Tier Lists'],
    [data.favorites_count, 'Jogos Favoritos'],
  ] as const;

  return (
    <>
      <div className={styles.statsGrid}>
        {stats.map(([value, label]) => (
          <Card className={styles.statCard} key={label}>
            <span className={styles.statValue}>{value}</span>
            <span className={styles.statLabel}>{label}</span>
          </Card>
        ))}
      </div>
      <div className={styles.detailsSection}>
        <Distribution
          title="Distribuição por Status"
          values={data.status_distribution}
          total={data.games_count}
          emptyMessage="Nenhum jogo cadastrado com status."
          colorFor={(status) => STATUS_COLORS[status] || 'var(--text-secondary)'}
        />
        <Distribution
          title="Distribuição por Loja"
          values={data.store_distribution ?? {}}
          total={data.games_count}
          emptyMessage="Nenhum jogo cadastrado com loja."
          labelFor={(store) => store === 'SEM_LOJA' ? 'Sem Loja' : getStoreLabel(store)}
          colorFor={(store) => STORE_COLORS[store] || 'var(--primary)'}
        />
        <Card className={styles.detailsCard}>
          <h3 className={styles.cardTitle}>Gênero Favorito</h3>
          <div className={styles.genreHighlight}>
            <div className={styles.gamepadIcon}>
              {data.most_played_genre
                ? <Gamepad2 aria-hidden="true" />
                : <HelpCircle aria-hidden="true" />}
            </div>
            {data.most_played_genre ? (
              <>
                <span className={styles.genreName}>{translateGenre(data.most_played_genre)}</span>
                <p className={styles.genreDesc}>Este é o gênero mais proeminente e jogado em sua biblioteca do VisualMemory.</p>
                {Object.keys(data.genre_distribution ?? {}).length > 0 && (
                  <Button variant="ghost" className={styles.viewGenresButton} onClick={onOpenGenres}>
                    Ver todos os gêneros
                  </Button>
                )}
              </>
            ) : (
              <p className={styles.emptyText}>Adicione jogos com gêneros para gerar estatísticas.</p>
            )}
          </div>
          {data.has_pending_genres && (
            <div className={styles.pendingGenresNotice}>
              <RefreshCw aria-hidden="true" className={styles.pendingGenresIcon} />
              <span className={styles.pendingGenresText}>Sincronizando gêneros e anos de lançamento da Steam em segundo plano, os dados serão atualizados gradualmente.</span>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
