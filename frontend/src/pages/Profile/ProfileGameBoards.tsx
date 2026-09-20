import { ChevronDown, ChevronRight, Clock3, Star } from 'lucide-react';
import { Card } from '@/components/Shared';
import type { DashboardGame, YearlyGames } from '@/features/profile/queries';
import { getBestGameCover } from '@/services/media';
import { MONTH_NAMES } from './profileUtils';
import styles from './Profile.module.css';

function GameGrid({ games, emptyMessage }: { games: DashboardGame[]; emptyMessage: string }) {
  if (games.length === 0) return <p className={styles.boardEmptyText}>{emptyMessage}</p>;

  return (
    <div className={styles.boardGamesGrid}>
      {games.map((game, index) => {
        const cover = getBestGameCover(game);
        return (
          <div key={`${game.title}-${index}`} className={styles.boardGameMiniCard}>
            {cover ? (
              <img src={cover} alt={game.title} className={styles.boardGameCover} />
            ) : (
              <div className={styles.boardGameCoverPlaceholder}><span>Sem capa</span></div>
            )}
            <div className={styles.boardGameDetails}>
              <span className={styles.boardGameTitle} title={game.title}>{game.title}</span>
              <span className={styles.boardGameMeta}>
                <span className={styles.boardGameMetaItem}>
                  <Clock3 aria-hidden="true" size={14} />
                  <span>{game.hours_played}h</span>
                </span>
                {game.rating !== null && (
                  <>
                    <span className={styles.boardGameMetaDivider} aria-hidden="true">|</span>
                    <span className={styles.boardGameMetaItem}>
                      <Star aria-hidden="true" size={14} />
                      <span>{game.rating}/10</span>
                    </span>
                  </>
                )}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CollapseButton({ collapsed, title, onToggle }: {
  collapsed: boolean;
  title: string;
  onToggle: () => void;
}) {
  return (
    <button type="button" className={styles.boardToggleButton} onClick={onToggle} aria-expanded={!collapsed}>
      <span className={styles.collapseIcon}>
        {collapsed ? <ChevronRight aria-hidden="true" size={16} /> : <ChevronDown aria-hidden="true" size={16} />}
      </span>
      <h3 className={styles.boardTitle}>{title}</h3>
    </button>
  );
}

export function SimpleGameBoard({ title, games, emptyMessage, collapsed, onToggle }: {
  title: string;
  games: DashboardGame[];
  emptyMessage: string;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <section className={styles.boardSection}>
      <Card className={styles.boardCard}>
        <div className={styles.boardHeader}>
          <CollapseButton collapsed={collapsed} title={title} onToggle={onToggle} />
          <span className={styles.boardCountLabel}>{games.length} {games.length === 1 ? 'jogo' : 'jogos'}</span>
        </div>
        {!collapsed && <div className={styles.boardContent}><GameGrid games={games} emptyMessage={emptyMessage} /></div>}
      </Card>
    </section>
  );
}

export function PeriodGameBoard({
  title,
  games,
  groups,
  selectedYear,
  selectedMonth,
  itemLabel,
  emptyMessage,
  collapsed,
  onToggle,
  onYearChange,
  onMonthChange,
}: {
  title: string;
  games: DashboardGame[];
  groups: YearlyGames[];
  selectedYear: number;
  selectedMonth: string;
  itemLabel: [string, string];
  emptyMessage: string;
  collapsed: boolean;
  onToggle: () => void;
  onYearChange: (year: number) => void;
  onMonthChange: (month: string) => void;
}) {
  const period = selectedMonth === 'all'
    ? `todo o ano de ${selectedYear}`
    : `${MONTH_NAMES[Number(selectedMonth)]} de ${selectedYear}`;

  return (
    <section className={styles.boardSection}>
      <Card className={styles.boardCard}>
        <div className={styles.boardHeader}>
          <CollapseButton collapsed={collapsed} title={title} onToggle={onToggle} />
          <div className={styles.boardFilters}>
            <select
              aria-label={`Ano de ${title}`}
              className={styles.boardSelect}
              value={selectedYear}
              onChange={(event) => onYearChange(Number(event.target.value))}
            >
              {groups.map((group) => <option key={group.year} value={group.year}>{group.year}</option>)}
              {groups.length === 0 && <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>}
            </select>
            <select
              aria-label={`Mês de ${title}`}
              className={styles.boardSelect}
              value={selectedMonth}
              onChange={(event) => onMonthChange(event.target.value)}
            >
              <option value="all">Todos os Meses</option>
              {MONTH_NAMES.map((month, index) => <option key={month} value={index}>{month}</option>)}
            </select>
          </div>
        </div>
        {!collapsed && (
          <div className={styles.boardContent}>
            <div className={styles.boardCounterWrapper}>
              <span className={styles.boardCount}>{games.length}</span>
              <span className={styles.boardCountLabel}>{games.length === 1 ? itemLabel[0] : itemLabel[1]} em {period}</span>
            </div>
            <GameGrid games={games} emptyMessage={emptyMessage} />
          </div>
        )}
      </Card>
    </section>
  );
}
