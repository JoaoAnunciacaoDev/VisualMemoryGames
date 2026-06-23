import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import styles from './TierListMaker.module.css';

interface Props {
  id: string;
  title: string;
  coverUrl: string | null;
}

export default function SortableGame({ id, title, coverUrl }: Props) {
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
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={styles.sortableGame}
      title={title}
    >
      {coverUrl ? (
        <img src={coverUrl} alt={title} draggable={false} />
      ) : (
        <div className={styles.noCover}>{title.substring(0, 2).toUpperCase()}</div>
      )}
    </div>
  );
}