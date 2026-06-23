import { useDroppable } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import SortableGame from './SortableGame';
import styles from './TierListMaker.module.css';

interface GameItem {
  id: string;
  title: string;
  coverUrl: string | null;
}

interface Props {
  id: string;
  label?: string;
  games: GameItem[];
  color?: string;
}

export default function TierRow({ id, label, games, color }: Props) {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div className={styles.tierRow}>
      {label && (
        <div className={styles.tierLabel} style={{ backgroundColor: color }}>
          {label}
        </div>
      )}
      
      <div ref={setNodeRef} className={styles.tierContent}>
        <SortableContext 
          items={games.map(g => g.id)} 
          strategy={horizontalListSortingStrategy}
        >
          {games.map((game) => (
            <SortableGame 
              key={game.id} 
              id={game.id} 
              title={game.title} 
              coverUrl={game.coverUrl} 
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}