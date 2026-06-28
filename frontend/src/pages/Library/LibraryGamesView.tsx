import LibraryCard from '@/components/LibraryCard/LibraryCard';
import styles from '@/pages/Library/Library.module.css';
import { groupBy } from '@/services/groupBy';
import { getBestGameCover } from '@/services/media';
import type { LibraryGame } from '@/types';

interface Props {
  games: LibraryGame[];
  filteredGames: LibraryGame[];
  groupByStatus: boolean;
  collapsedStatuses: Set<string>;
  onToggleStatusCollapse: (status: string) => void;
  onSelectGame: (game: LibraryGame) => void;
}

const STATUS_ORDER = ['Jogando', 'Zerado', 'Platinado', 'Em Espera', 'Abandonado', 'Quero Jogar'];

export default function LibraryGamesView({
  games,
  filteredGames,
  groupByStatus,
  collapsedStatuses,
  onToggleStatusCollapse,
  onSelectGame,
}: Props) {
  if (filteredGames.length === 0) {
    return (
      <div className={styles.emptyState}>
        {games.length === 0
          ? 'Sua biblioteca está vazia. Vá na aba "Pesquisar / Adicionar" para buscar jogos!'
          : 'Nenhum jogo encontrado com os filtros aplicados.'}
      </div>
    );
  }

  if (!groupByStatus) {
    return (
      <div className={styles.grid}>
        {filteredGames.map((game) => (
          <LibraryCard
            key={game.id}
            title={game.title}
            coverUrl={getBestGameCover(game)}
            status={game.status}
            rating={game.rating}
            startedAt={game.started_at}
            finishedAt={game.finished_at}
            onClick={() => onSelectGame(game)}
          />
        ))}
      </div>
    );
  }

  const grouped = groupBy(filteredGames, 'status');

  return (
    <div className={styles.groupedContainer}>
      {STATUS_ORDER.filter((status) => grouped[status]?.length > 0).map((status) => {
        const isCollapsed = collapsedStatuses.has(status);
        return (
          <div key={status} className={styles.statusGroup}>
            <h3
              className={`${styles.statusGroupTitle} ${!isCollapsed ? styles.statusGroupTitleExpanded : ''}`}
              onClick={() => onToggleStatusCollapse(status)}
              title="Clique para expandir/recolher"
            >
              {isCollapsed ? '▶' : '▼'} {status}
            </h3>
            {!isCollapsed && (
              <div className={styles.grid}>
                {grouped[status].map((game) => (
                  <LibraryCard
                    key={game.id}
                    title={game.title}
                    coverUrl={getBestGameCover(game)}
                    status={game.status}
                    rating={game.rating}
                    startedAt={game.started_at}
                    finishedAt={game.finished_at}
                    onClick={() => onSelectGame(game)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}