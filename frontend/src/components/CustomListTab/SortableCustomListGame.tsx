import type { KeyboardEvent } from 'react';
import { Trash2 } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getBestGameCover } from '@/services/media';
import type { GameInList } from '@/types';
import styles from './CustomListTab.module.css';

export default function SortableCustomListGame({
  game,
  listId,
  selectedGameId,
  onSelect,
  onRemove,
}: {
  game: GameInList;
  listId: string;
  selectedGameId: string | null;
  onSelect: (id: string | null) => void;
  onRemove: (target: { listId: string; gameId: string }) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: game.id });
  const isSelected = selectedGameId === game.id;
  const cover = getBestGameCover(game);
  const toggleSelected = () => onSelect(isSelected ? null : game.id);
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleSelected();
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className={`${styles.gameItem} ${isSelected ? styles.gameItemSelected : ''}`}
      onClick={(event) => { event.stopPropagation(); toggleSelected(); }}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={`${isSelected ? 'Desselecionar' : 'Selecionar'} jogo ${game.title}`}
    >
      <div {...attributes} {...listeners} className={styles.dragHandle}>
        {cover
          ? <img src={cover} alt={game.title} className={styles.cover} draggable={false} />
          : <div className={styles.noCover}>{game.title.substring(0, 2).toUpperCase()}</div>}
        <span className={styles.gameTitle}>{game.title}</span>
      </div>
      {isSelected && (
        <button
          type="button"
          className={styles.removeGame}
          onClick={(event) => { event.stopPropagation(); onRemove({ listId, gameId: game.id }); }}
          title="Remover da lista"
          aria-label={`Remover ${game.title} da lista`}
        >
          <Trash2 aria-hidden="true" size={16} />
        </button>
      )}
    </div>
  );
}
