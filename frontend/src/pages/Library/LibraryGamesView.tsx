import type { LibraryGame } from '@/types';
import type { GroupMode } from './Library.types';
import LibraryGameGrid from './LibraryGameGrid';
import LibraryGameGroupSection from './LibraryGameGroupSection';
import { groupLibraryGames } from './libraryGameGroups';
import styles from './Library.module.css';

interface Props {
  games: LibraryGame[];
  filteredGames: LibraryGame[];
  groupMode?: GroupMode;
  groupByStatus?: boolean;
  collapsedStatuses: Set<string>;
  onToggleStatusCollapse: (status: string) => void;
  onSelectGame: (game: LibraryGame) => void;
}

export default function LibraryGamesView({
  games,
  filteredGames,
  groupMode,
  groupByStatus = true,
  collapsedStatuses,
  onToggleStatusCollapse,
  onSelectGame,
}: Props) {
  const mode: GroupMode = groupMode ?? (groupByStatus ? 'status' : 'none');

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
    return <LibraryGameGrid games={filteredGames} onSelectGame={onSelectGame} />;
  }

  return (
    <div className={styles.groupedContainer}>
      {groupLibraryGames(filteredGames, mode).map((group) => (
        <LibraryGameGroupSection
          key={group.label}
          label={group.label}
          games={group.games}
          collapsed={collapsedStatuses.has(group.label)}
          onToggle={() => onToggleStatusCollapse(group.label)}
          onSelectGame={onSelectGame}
        />
      ))}
    </div>
  );
}
