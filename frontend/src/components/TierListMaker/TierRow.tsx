import { useState } from 'react';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';

import SortableGame from '@/components/TierListMaker/SortableGame';

import styles from '@/components/TierListMaker/TierListStyle.module.css';

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
  onLabelChange?: (newLabel: string) => void;
  onColorChange?: (newColor: string) => void;
  onDelete?: () => void;
  onRemoveGame?: (gameId: string) => void;
  selectedGameId?: string | null;
  onSelectGame?: (gameId: string | null) => void;
}

export default function TierRow({ id, label, games, color, onLabelChange, onColorChange, onDelete, onRemoveGame, selectedGameId, onSelectGame }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const [editingLabel, setEditingLabel] = useState(false);

  return (
    <div className={`${styles.tierRow} ${isOver ? styles.tierRowOver : ''}`}>
      {label !== undefined && (
        <div className={styles.tierLabelWrapper}>

          <div className={styles.tierControls}>
            {onColorChange && (
              <input
                type="color"
                value={color}
                onChange={(e) => onColorChange(e.target.value)}
                className={styles.colorPicker}
                title="Mudar cor"
              />
            )}

            {onDelete && (
              <button
                className={styles.deleteTierButton}
                onClick={onDelete}
                title="Deletar tier"
              >
                X
              </button>
            )}
          </div>

          <div
            className={styles.tierLabel}
            style={{ backgroundColor: color }}
            onDoubleClick={() => onLabelChange && setEditingLabel(true)}
          >
            {editingLabel ? (
              <input
                className={styles.tierLabelInput}
                defaultValue={label}
                maxLength={36}
                autoFocus
                onBlur={(e) => {
                  onLabelChange?.(e.target.value);
                  setEditingLabel(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onLabelChange?.((e.target as HTMLInputElement).value);
                    setEditingLabel(false);
                  }
                }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              label
            )}
          </div>

        </div>
      )}

      <div ref={setNodeRef} className={styles.tierContent}>
        <SortableContext
          items={games.map((g) => g.id)}
          strategy={horizontalListSortingStrategy}
        >
          {games.map((game) => (
            <SortableGame
              key={game.id}
              id={game.id}
              title={game.title}
              coverUrl={game.coverUrl}
              isSelected={selectedGameId === game.id}
              onSelect={() => onSelectGame?.(selectedGameId === game.id ? null : game.id)}
              onRemove={onRemoveGame ? () => onRemoveGame(game.id) : undefined}
            />
          ))}
          {games.length === 0 && (
            <div className={styles.emptyTier}>Arraste jogos aqui</div>
          )}
        </SortableContext>
      </div>
    </div>
  );
}