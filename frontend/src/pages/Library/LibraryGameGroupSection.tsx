import { ChevronDown, ChevronRight } from 'lucide-react';
import type { LibraryGame } from '@/types';
import LibraryGameGrid from './LibraryGameGrid';
import styles from './Library.module.css';

interface Props {
  label: string;
  games: LibraryGame[];
  collapsed: boolean;
  onToggle: () => void;
  onSelectGame: (game: LibraryGame) => void;
}

export default function LibraryGameGroupSection({
  label,
  games,
  collapsed,
  onToggle,
  onSelectGame,
}: Props) {
  return (
    <section className={styles.statusGroup}>
      <button
        type="button"
        className={`${styles.statusGroupTitle} ${!collapsed ? styles.statusGroupTitleExpanded : ''}`}
        onClick={onToggle}
        title="Clique para expandir/recolher"
        aria-expanded={!collapsed}
      >
        {collapsed ? (
          <ChevronRight aria-hidden="true" size={16} />
        ) : (
          <ChevronDown aria-hidden="true" size={16} />
        )}
        {label} ({games.length})
      </button>
      {!collapsed && <LibraryGameGrid games={games} onSelectGame={onSelectGame} />}
    </section>
  );
}
