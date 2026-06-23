import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';

import TierRow from './TierRow';
import SortableGame from './SortableGame';
import styles from './TierListMaker.module.css';

interface GameItem {
  id: string;
  title: string;
  coverUrl: string | null;
}

const MOCK_GAMES: GameItem[] = [
  { id: '1', title: 'Elden Ring', coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co4jni.png' },
  { id: '2', title: 'Hollow Knight', coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co2k05.png' },
  { id: '3', title: 'Balatro', coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co7vtt.png' },
];

const TIER_COLORS: Record<string, string> = {
  S: '#ff7f7f',
  A: '#ffbf7f',
  B: '#ffff7f',
  C: '#7fff7f',
  D: '#7fbfff',
};

export default function TierListMaker() {
  const [tiers, setTiers] = useState<Record<string, GameItem[]>>({
    S: [],
    A: [],
    B: [],
    C: [],
    D: [],
    unassigned: MOCK_GAMES,
  });

  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const findContainer = (id: string) => {
    if (id in tiers) return id;
    return Object.keys(tiers).find((key) => tiers[key].some((g) => g.id === id));
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeContainer = findContainer(active.id as string);
    const overContainer = findContainer(over.id as string);

    if (!activeContainer || !overContainer || activeContainer === overContainer) return;

    setTiers((prev) => {
      const activeItems = prev[activeContainer];
      const overItems = prev[overContainer];
      const activeIndex = activeItems.findIndex((g) => g.id === active.id);
      const overIndex = overItems.findIndex((g) => g.id === over.id);

      let newIndex = overIndex >= 0 ? overIndex : overItems.length + 1;

      return {
        ...prev,
        [activeContainer]: activeItems.filter((g) => g.id !== active.id),
        [overContainer]: [
          ...overItems.slice(0, newIndex),
          activeItems[activeIndex],
          ...overItems.slice(newIndex),
        ],
      };
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) {
      setActiveId(null);
      return;
    }

    const activeContainer = findContainer(active.id as string);
    const overContainer = findContainer(over.id as string);

    if (activeContainer && overContainer && activeContainer === overContainer) {
      const activeIndex = tiers[activeContainer].findIndex((g) => g.id === active.id);
      const overIndex = tiers[overContainer].findIndex((g) => g.id === over.id);

      if (activeIndex !== overIndex) {
        setTiers((prev) => ({
          ...prev,
          [activeContainer]: arrayMove(prev[activeContainer], activeIndex, overIndex),
        }));
      }
    }
    setActiveId(null);
  };

  const activeGame = activeId
    ? Object.values(tiers).flat().find((g) => g.id === activeId)
    : null;

  return (
    <div className={styles.container}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className={styles.board}>
          {['S', 'A', 'B', 'C', 'D'].map((tierId) => (
            <TierRow
              key={tierId}
              id={tierId}
              label={tierId}
              color={TIER_COLORS[tierId]}
              games={tiers[tierId]}
            />
          ))}
        </div>

        <div className={styles.poolArea}>
          <h3>Jogos da Biblioteca</h3>
          <TierRow id="unassigned" games={tiers['unassigned']} />
        </div>

        <DragOverlay>
          {activeGame ? (
            <SortableGame id={activeGame.id} title={activeGame.title} coverUrl={activeGame.coverUrl} />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}