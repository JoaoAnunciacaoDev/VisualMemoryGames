import { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  rectIntersection,
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

interface Tier {
  id: string;
  label: string;
  color: string;
}

const DEFAULT_TIERS: Tier[] = [
  { id: 'S', label: 'S', color: '#ff7f7f' },
  { id: 'A', label: 'A', color: '#ffbf7f' },
  { id: 'B', label: 'B', color: '#ffff7f' },
  { id: 'C', label: 'C', color: '#7fff7f' },
  { id: 'D', label: 'D', color: '#7fbfff' },
];

const MOCK_GAMES: GameItem[] = [
  { id: '1', title: 'Elden Ring', coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co4jni.png' },
  { id: '2', title: 'Hollow Knight', coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co2k05.png' },
  { id: '3', title: 'Balatro', coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co7vtt.png' },
];

const POOL_ID = 'unassigned';

export default function TierListMaker() {
  const [tiers, setTiers] = useState<Tier[]>(DEFAULT_TIERS);
  const [games, setGames] = useState<Record<string, GameItem[]>>({
    S: [], A: [], B: [], C: [], D: [],
    [POOL_ID]: MOCK_GAMES,
  });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newTierLabel, setNewTierLabel] = useState('');
  const [newTierColor, setNewTierColor] = useState('#cccccc');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const findContainer = useCallback((id: string) => {
    if (id in games) return id;
    return Object.keys(games).find((key) => games[key].some((g) => g.id === id));
  }, [games]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeContainer = findContainer(active.id as string);
    const overContainer = findContainer(over.id as string) ?? (over.id as string);

    if (!activeContainer || !overContainer || activeContainer === overContainer) return;

    setGames((prev) => {
      const activeItems = [...prev[activeContainer]];
      const overItems = [...prev[overContainer]];
      const activeIndex = activeItems.findIndex((g) => g.id === active.id);
      const overIndex = overItems.findIndex((g) => g.id === over.id);
      const newIndex = overIndex >= 0 ? overIndex : overItems.length;

      const item = activeItems[activeIndex];

      return {
        ...prev,
        [activeContainer]: activeItems.filter((g) => g.id !== active.id),
        [overContainer]: [
          ...overItems.slice(0, newIndex),
          item,
          ...overItems.slice(newIndex),
        ],
      };
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const activeContainer = findContainer(active.id as string);
    const overContainer = findContainer(over.id as string) ?? (over.id as string);

    if (!activeContainer || !overContainer) return;

    if (activeContainer === overContainer) {
      const activeIndex = games[activeContainer].findIndex((g) => g.id === active.id);
      const overIndex = games[overContainer].findIndex((g) => g.id === over.id);
      if (activeIndex !== overIndex) {
        setGames((prev) => ({
          ...prev,
          [activeContainer]: arrayMove(prev[activeContainer], activeIndex, overIndex),
        }));
      }
    }
  };

  const handleAddTier = () => {
    if (!newTierLabel.trim()) return;
    const id = `tier_${Date.now()}`;
    setTiers((prev) => [...prev, { id, label: newTierLabel.trim(), color: newTierColor }]);
    setGames((prev) => ({ ...prev, [id]: [] }));
    setNewTierLabel('');
    setNewTierColor('#cccccc');
  };

  const handleDeleteTier = (tierId: string) => {
    setGames((prev) => ({
      ...prev,
      [POOL_ID]: [...prev[POOL_ID], ...prev[tierId]],
      [tierId]: [],
    }));
    setTiers((prev) => prev.filter((t) => t.id !== tierId));
  };

  const handleLabelChange = (tierId: string, newLabel: string) => {
    setTiers((prev) => prev.map((t) => t.id === tierId ? { ...t, label: newLabel } : t));
  };

  const handleColorChange = (tierId: string, newColor: string) => {
    setTiers((prev) => prev.map((t) => t.id === tierId ? { ...t, color: newColor } : t));
  };

  const activeGame = activeId
    ? Object.values(games).flat().find((g) => g.id === activeId)
    : null;

  return (
    <div className={styles.container}>
      <DndContext
        sensors={sensors}
        collisionDetection={rectIntersection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className={styles.board}>
          {tiers.map((tier) => (
            <TierRow
              key={tier.id}
              id={tier.id}
              label={tier.label}
              color={tier.color}
              games={games[tier.id] ?? []}
              onLabelChange={(label) => handleLabelChange(tier.id, label)}
              onColorChange={(color) => handleColorChange(tier.id, color)}
              onDelete={() => handleDeleteTier(tier.id)}
            />
          ))}
        </div>

        <div className={styles.addTierRow}>
          <input
            type="text"
            placeholder="Nome do novo tier"
            value={newTierLabel}
            onChange={(e) => setNewTierLabel(e.target.value)}
            className={styles.addTierInput}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTier()}
          />
          <input
            type="color"
            value={newTierColor}
            onChange={(e) => setNewTierColor(e.target.value)}
            className={styles.colorPicker}
          />
          <button className={styles.addTierButton} onClick={handleAddTier}>
            + Adicionar Tier
          </button>
        </div>

        <div className={styles.poolArea}>
          <h3>Jogos não classificados</h3>
          <TierRow id={POOL_ID} games={games[POOL_ID]} />
        </div>

        <DragOverlay>
          {activeGame ? (
            <SortableGame
              id={activeGame.id}
              title={activeGame.title}
              coverUrl={activeGame.coverUrl}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}