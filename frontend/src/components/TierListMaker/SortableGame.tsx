import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import styles from './TierListMaker.module.css';

interface Props {
  id: string;
  title: string;
  coverUrl: string | null;
  onRemove?: () => void;
  isSelected?: boolean;
  onSelect?: () => void;
}

export default function SortableGame({ id, title, coverUrl, onRemove, isSelected, onSelect }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    visibility: isDragging ? 'hidden' as const : 'visible' as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.sortableGame} ${isSelected ? styles.selected : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.();
      }}
      title={title}
    >
      <div className={styles.dragHandle} {...attributes} {...listeners}>
        {coverUrl ? (
          <img src={coverUrl} alt={title} draggable={false} />
        ) : (
          <div className={styles.noCover}>{title.substring(0, 2).toUpperCase()}</div>
        )}
      </div>

      {isSelected && onRemove && (
        <button
          className={styles.removeGameButton}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          title="Remover da tier list"
        >
          X
        </button>
      )}
    </div>
  );
}