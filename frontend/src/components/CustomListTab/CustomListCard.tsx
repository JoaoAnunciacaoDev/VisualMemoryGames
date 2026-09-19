import type { KeyboardEvent } from 'react';
import { ChevronDown, ChevronUp, Flag, Star, Trash2, Trophy } from 'lucide-react';
import { closestCenter, DndContext, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { rectSortingStrategy, SortableContext } from '@dnd-kit/sortable';
import { Button, Card } from '@/components/Shared';
import type { CustomList } from '@/features/custom-lists/queries';
import SortableCustomListGame from './SortableCustomListGame';
import styles from './CustomListTab.module.css';

function SystemListIcon({ type }: { type?: string | null }) {
  if (type === 'favorites') return <Star aria-hidden="true" size={16} />;
  if (type === 'completed_year') return <Flag aria-hidden="true" size={16} />;
  if (type === 'platinized_year') return <Trophy aria-hidden="true" size={16} />;
  return null;
}

export default function CustomListCard({
  list, expanded, editing, editingName, selectedGameId, sensors,
  onToggle, onEditingNameChange, onStartRenaming, onRename, onCancelRenaming,
  onDelete, onSelectGame, onRemoveGame, onAddGames, onReorder,
}: {
  list: CustomList;
  expanded: boolean;
  editing: boolean;
  editingName: string;
  selectedGameId: string | null;
  sensors: ReturnType<typeof useSensors>;
  onToggle: () => void;
  onEditingNameChange: (name: string) => void;
  onStartRenaming: () => void;
  onRename: () => void;
  onCancelRenaming: () => void;
  onDelete: () => void;
  onSelectGame: (id: string | null) => void;
  onRemoveGame: (target: { listId: string; gameId: string }) => void;
  onAddGames: () => void;
  onReorder: (event: DragEndEvent) => void;
}) {
  const handleHeaderKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onToggle(); }
  };

  return (
    <Card className={`${styles.listCard} ${expanded ? styles.listCardSelected : ''}`}>
      <div className={styles.listHeader} onClick={onToggle} role="button" tabIndex={0} onKeyDown={handleHeaderKeyDown} aria-expanded={expanded} aria-label={`${expanded ? 'Recolher' : 'Expandir'} lista ${list.name}`}>
        <div className={styles.listInfo}>
          {list.is_system ? (
            <span className={styles.listName}><SystemListIcon type={list.list_type} />{list.name}</span>
          ) : editing ? (
            <input
              className={styles.editInput}
              value={editingName}
              onChange={(event) => onEditingNameChange(event.target.value)}
              onBlur={onRename}
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => {
                if (event.key === 'Enter') onRename();
                if (event.key === 'Escape') onCancelRenaming();
              }}
              autoFocus
            />
          ) : (
            <span className={styles.listName} onDoubleClick={(event) => { event.stopPropagation(); onStartRenaming(); }} title="Clique duplo para renomear">{list.name}</span>
          )}
          <span className={styles.listCount}>{list.games.length} jogos</span>
        </div>
        <div className={styles.listActions}>
          <span className={styles.expandIcon}>{expanded ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}</span>
          {!list.is_system && (
            <Button type="button" variant="ghost" className={`${styles.iconButton} ${styles.deleteIcon}`} onClick={(event) => { event.stopPropagation(); onDelete(); }} aria-label={`Excluir lista ${list.name}`}>
              <Trash2 aria-hidden="true" size={18} />
            </Button>
          )}
        </div>
      </div>
      {expanded && (
        <div className={styles.listContent}>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onReorder}>
            <SortableContext items={list.games.map((game) => game.id)} strategy={rectSortingStrategy}>
              <div className={styles.gameGrid}>
                {list.games.map((game) => (
                  <SortableCustomListGame key={game.id} game={game} listId={list.id} selectedGameId={selectedGameId} onSelect={onSelectGame} onRemove={onRemoveGame} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          {!list.is_system && <Button type="button" variant="primary" className={styles.addGameButton} onClick={onAddGames}>+ Adicionar Jogo</Button>}
        </div>
      )}
    </Card>
  );
}
