import LibraryCard from '@/components/LibraryCard/LibraryCard';
import styles from '@/pages/Library/Library.module.css';
import { getBestGameCover } from '@/services/media';
import type { LibraryGame } from '@/types';
import type { GroupMode } from '@/pages/Library/Library.types';

interface Props {
  games: LibraryGame[];
  filteredGames: LibraryGame[];
  groupMode?: GroupMode;
  groupByStatus?: boolean;
  collapsedStatuses: Set<string>;
  onToggleStatusCollapse: (status: string) => void;
  onSelectGame: (game: LibraryGame) => void;
}

const STATUS_ORDER = ['Jogando', 'Zerado', 'Platinado', 'Em Espera', 'Abandonado', 'Quero Jogar'];

export default function LibraryGamesView({
  games,
  filteredGames,
  groupMode,
  groupByStatus = true,
  collapsedStatuses,
  onToggleStatusCollapse,
  onSelectGame,
}: Props) {
  const mode: GroupMode = groupMode !== undefined ? groupMode : (groupByStatus ? 'status' : 'none');

  if (filteredGames.length === 0) {
    return (
      <div className={styles.emptyState}>
        {games.length === 0
          ? 'Sua biblioteca está vazia. Vá na aba "Pesquisar / Adicionar" para buscar jogos!'
          : 'Nenhum jogo encontrado com os filtros aplicados.'}
      </div>
    );
  }

  if (mode === 'none') {
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
            platinumAt={game.platinum_at}
            store={game.store}
            favorite={game.favorite}
            onClick={() => onSelectGame(game)}
          />
        ))}
      </div>
    );
  }

  // Agrupamento por Status
  if (mode === 'status') {
    const groupedByStatus: Record<string, LibraryGame[]> = {};
    filteredGames.forEach((game) => {
      const st = game.status || 'Outro';
      if (!groupedByStatus[st]) groupedByStatus[st] = [];
      groupedByStatus[st].push(game);
    });

    const activeStatuses = STATUS_ORDER.filter((st) => groupedByStatus[st]?.length > 0);
    // Adicionar quaisquer status que não estejam em STATUS_ORDER
    Object.keys(groupedByStatus).forEach((st) => {
      if (!activeStatuses.includes(st)) activeStatuses.push(st);
    });

    return (
      <div className={styles.groupedContainer}>
        {activeStatuses.map((status) => {
          const isCollapsed = collapsedStatuses.has(status);
          const gameList = groupedByStatus[status] || [];
          return (
            <div key={status} className={styles.statusGroup}>
              <h3
                className={`${styles.statusGroupTitle} ${!isCollapsed ? styles.statusGroupTitleExpanded : ''}`}
                onClick={() => onToggleStatusCollapse(status)}
                title="Clique para expandir/recolher"
              >
                {isCollapsed ? '▶' : '▼'} {status} ({gameList.length})
              </h3>
              {!isCollapsed && (
                <div className={styles.grid}>
                  {gameList.map((game) => (
                    <LibraryCard
                      key={game.id}
                      title={game.title}
                      coverUrl={getBestGameCover(game)}
                      status={game.status}
                      rating={game.rating}
                      startedAt={game.started_at}
                      finishedAt={game.finished_at}
                      platinumAt={game.platinum_at}
                      store={game.store}
                      favorite={game.favorite}
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

  // Agrupamento por Loja
  const groupedByStore: Record<string, LibraryGame[]> = {};
  filteredGames.forEach((game) => {
    const storeName = game.store?.trim() || 'Sem Loja';
    if (!groupedByStore[storeName]) groupedByStore[storeName] = [];
    groupedByStore[storeName].push(game);
  });

  const stores = Object.keys(groupedByStore).sort();

  return (
    <div className={styles.groupedContainer}>
      {stores.map((storeName) => {
        const isCollapsed = collapsedStatuses.has(storeName);
        const gameList = groupedByStore[storeName];
        return (
          <div key={storeName} className={styles.statusGroup}>
            <h3
              className={`${styles.statusGroupTitle} ${!isCollapsed ? styles.statusGroupTitleExpanded : ''}`}
              onClick={() => onToggleStatusCollapse(storeName)}
              title="Clique para expandir/recolher"
            >
              {isCollapsed ? '▶' : '▼'} {storeName} ({gameList.length})
            </h3>
            {!isCollapsed && (
              <div className={styles.grid}>
                {gameList.map((game) => (
                  <LibraryCard
                    key={game.id}
                    title={game.title}
                    coverUrl={getBestGameCover(game)}
                    status={game.status}
                    rating={game.rating}
                    startedAt={game.started_at}
                    finishedAt={game.finished_at}
                    platinumAt={game.platinum_at}
                    store={game.store}
                    favorite={game.favorite}
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