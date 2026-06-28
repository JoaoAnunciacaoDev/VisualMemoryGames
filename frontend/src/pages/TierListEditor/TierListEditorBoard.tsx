import {
  DndContext, DragOverlay, PointerSensor, KeyboardSensor,
  useSensor, useSensors, rectIntersection, type DragStartEvent, type DragOverEvent, type DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

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
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
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
          />
        ))}
      </div>

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