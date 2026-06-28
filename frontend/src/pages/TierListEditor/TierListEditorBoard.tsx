import {
  DndContext, DragOverlay, PointerSensor, KeyboardSensor,
  useSensor, useSensors, rectIntersection, TouchSensor,
  type DragStartEvent, type DragOverEvent, type DragEndEvent,
} from '@dnd-kit/core';
import {
  sortableKeyboardCoordinates, SortableContext, verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import Button from '@/components/Shared/Button/Button';
import Input from '@/components/Shared/Input/Input';
import TierRow from '@/components/TierListMaker/TierRow';
import SortableGame from '@/components/TierListMaker/SortableGame';
import styles from '@/pages/TierListEditor/TierListEditor.module.css';
import type { GameItem, Tier } from '@/hooks/useTierListEditor';

interface Props {
  tiers: Tier[];
  games: Record<string, GameItem[]>;
  poolGames: GameItem[];
  selectedGameId: string | null;
  newTierLabel: string;
  newTierColor: string;
  activeGame: GameItem | null;
  onSelectedGameChange: (value: string | null) => void;
  onNewTierLabelChange: (value: string) => void;
  onNewTierColorChange: (value: string) => void;
  onAddTier: () => void;
  onRemoveGame: (gameId: string) => void;
  onRemoveTier: (tierId: string) => void;
  onUpdateTierLabel: (tierId: string, label: string) => void;
  onUpdateTierColor: (tierId: string, color: string) => void;
  onDragStart: (event: DragStartEvent) => void;
  onDragOver: (event: DragOverEvent) => void;
  onDragEnd: (event: DragEndEvent) => Promise<void>;
  onTierDragStart: (event: DragStartEvent) => void;
  onTierDragOver: (event: DragOverEvent) => void;
  onTierDragEnd: (event: DragEndEvent) => void;
}

export default function TierListEditorBoard({
  tiers,
  games,
  poolGames,
  selectedGameId,
  newTierLabel,
  newTierColor,
  activeGame,
  onSelectedGameChange,
  onNewTierLabelChange,
  onNewTierColorChange,
  onAddTier,
  onRemoveGame,
  onRemoveTier,
  onUpdateTierLabel,
  onUpdateTierColor,
  onDragStart,
  onDragOver,
  onDragEnd,
  onTierDragStart,
  onTierDragOver,
  onTierDragEnd,
}: Props) {
    const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Unifica os handlers conforme o tipo de arrasto (tier vs jogo)
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current?.type === 'tier') {
      onTierDragStart(event);
    } else {
      onDragStart(event);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active } = event;
    if (active.data.current?.type === 'tier') {
      onTierDragOver(event);
    } else {
      onDragOver(event);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active } = event;
    if (active.data.current?.type === 'tier') {
      onTierDragEnd(event);
    } else {
      await onDragEnd(event);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={tiers.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className={styles.board}>
          {tiers.map((tier) => (
            <TierRow
              key={tier.id}
              id={tier.id}
              label={tier.label}
              color={tier.color}
              games={games[tier.id] ?? []}
              onLabelChange={(label) => onUpdateTierLabel(tier.id, label)}
              onColorChange={(color) => onUpdateTierColor(tier.id, color)}
              onDelete={() => onRemoveTier(tier.id)}
              onRemoveGame={onRemoveGame}
              selectedGameId={selectedGameId}
              onSelectGame={onSelectedGameChange}
              isTierDraggable={true}
            />
          ))}
        </div>
      </SortableContext>

      {/* O resto do código permanece igual */}
      <div className={styles.addTierRow}>
        <Input
          type="text"
          placeholder="Nome do novo tier..."
          value={newTierLabel}
          onChange={(e) => onNewTierLabelChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onAddTier()}
          className={styles.addTierInput}
        />
        <input
          type="color"
          value={newTierColor}
          onChange={(e) => onNewTierColorChange(e.target.value)}
          className={styles.colorPicker}
        />
        <Button variant="primary" className={styles.addTierButton} onClick={onAddTier}>
          + Adicionar Tier
        </Button>
      </div>

      <div className={styles.poolArea}>
        <h3>Jogos não classificados</h3>
        <TierRow
          id="unassigned"
          games={poolGames}
          onRemoveGame={onRemoveGame}
          selectedGameId={selectedGameId}
          onSelectGame={onSelectedGameChange}
        />
      </div>

      <DragOverlay>
        {activeGame && (
          <SortableGame id={activeGame.id} title={activeGame.title} coverUrl={activeGame.coverUrl} />
        )}
      </DragOverlay>
    </DndContext>
  );
}