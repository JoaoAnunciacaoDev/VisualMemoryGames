import { CSSProperties, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useSortable, SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { GameItem } from '@/hooks/useTierListEditor';

import SortableGame from '@/components/TierListMaker/SortableGame';
import styles from '@/components/TierListMaker/TierListStyle.module.css';

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
  isTierDraggable?: boolean;
}

export default function TierRow({
  id, label, games, color, onLabelChange, onColorChange, onDelete,
  onRemoveGame, selectedGameId, onSelectGame, isTierDraggable = false,
}: Props) {
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({ id });
  const [editingLabel, setEditingLabel] = useState(false);

  const {
  attributes: sortableAttributes,
  listeners: sortableListeners,
  setNodeRef: setSortableRef,
  transform: sortableTransform,
  transition: sortableTransition,
  isDragging: isTierDragging,
  } = useSortable({
    id,
    data: { type: 'tier' },
    disabled: !isTierDraggable,
  });

  const setRefs = (node: HTMLDivElement | null) => {
    setDroppableRef(node);
    setSortableRef(node);
  };

  const style: CSSProperties = isTierDraggable
  ? {
      transform: CSS.Transform.toString(sortableTransform) || undefined,
      transition: sortableTransition ?? undefined,
      opacity: isTierDragging ? 0.5 : 1,
    }
  : {};

  return (
    <div
      ref={setRefs}
      className={`${styles.tierRow} ${isOver ? styles.tierRowOver : ''} ${isTierDragging ? styles.tierRowDragging : ''}`}
    >
      {label !== undefined && (
        <div
          ref={setSortableRef}
          className={styles.tierLabelWrapper}
          style={style}
          {...(isTierDraggable ? { ...sortableListeners, ...sortableAttributes } : {})}
        >
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
                type="button"
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
            role={onLabelChange ? 'button' : undefined}
            tabIndex={onLabelChange ? 0 : undefined}
            onKeyDown={(e) => {
              if (!onLabelChange) return;
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setEditingLabel(true);
              }
            }}
            aria-label={onLabelChange ? `Editar tier ${label}` : undefined}
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

      <div className={styles.tierContent}>
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