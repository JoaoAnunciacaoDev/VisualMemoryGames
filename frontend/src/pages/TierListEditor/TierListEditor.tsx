import { useState } from 'react';
import {
  DndContext, DragOverlay, PointerSensor, KeyboardSensor,
  useSensor, useSensors, rectIntersection,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

import TierRow from '@/components/TierListMaker/TierRow';
import SortableGame from '@/components/TierListMaker/SortableGame';
import GameSearchModal from '@/components/GameSearchModal/GameSearchModal';
import ConfirmModal from '@/components/Shared/ConfirmModal/ConfirmModal';
import Button from '@/components/Shared/Button/Button';
import Input from '@/components/Shared/Input/Input';

import { useConfirmAction } from '@/hooks/useConfirmAction';
import { useTierListEditor, POOL_ID } from '@/hooks/useTierListEditor';
import { useDragHandlers } from '@/hooks/useDragHandlers';

import styles from '@/pages/TierListEditor/TierListEditor.module.css';

export default function TierListEditor() {
  const {
    title, setTitle, tiers, games, setGames, loading,
    existingGameIds, saveTitle, addTier, removeTier,
    updateTierLabel, updateTierColor, addGameToPool,
    removeGame, moveGame, reorderTier,
  } = useTierListEditor();

  const { activeGame, handleDragStart, handleDragOver, handleDragEnd } = useDragHandlers({
    games, setGames, moveGame, reorderTier,
  });

  const [editingTitle, setEditingTitle] = useState(false);
  const [newTierLabel, setNewTierLabel] = useState('');
  const [newTierColor, setNewTierColor] = useState('#cccccc');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);

  const removeGameConfirm = useConfirmAction<string>();
  const removeTierConfirm = useConfirmAction<string>();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleTitleSave = () => {
    if (title.trim()) {
      saveTitle(title);
      setEditingTitle(false);
    }
  };

  const handleAddTier = () => {
    if (!newTierLabel.trim()) return;
    addTier(newTierLabel.trim(), newTierColor);
    setNewTierLabel('');
    setNewTierColor('#cccccc');
  };

  if (loading) return <p>Carregando...</p>;

  return (
    <div className={styles.page} onClick={() => setSelectedGameId(null)}>
      <div className={styles.header}>
        {editingTitle ? (
          <Input
            className={styles.titleInput}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
            autoFocus
          />
        ) : (
          <h2 className={styles.title} onDoubleClick={() => setEditingTitle(true)}>
            {title}
          </h2>
        )}
        <Button
          variant="primary"
          className={styles.addGameButton}
          onClick={(e) => { e.stopPropagation(); setShowSearchModal(true); }}
        >
          + Adicionar Jogo
        </Button>
      </div>

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
              onLabelChange={(label) => updateTierLabel(tier.id, label)}
              onColorChange={(color) => updateTierColor(tier.id, color)}
              onDelete={() => removeTierConfirm.open(tier.id)}
              onRemoveGame={(gameId) => removeGameConfirm.open(gameId)}
              selectedGameId={selectedGameId}
              onSelectGame={setSelectedGameId}
            />
          ))}
        </div>

        <div className={styles.addTierRow}>
          <Input
            type="text"
            placeholder="Nome do novo tier..."
            value={newTierLabel}
            onChange={(e) => setNewTierLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTier()}
            className={styles.addTierInput}
          />
          <input
            type="color"
            value={newTierColor}
            onChange={(e) => setNewTierColor(e.target.value)}
            className={styles.colorPicker}
          />
          <Button variant="primary" className={styles.addTierButton} onClick={handleAddTier}>
            + Adicionar Tier
          </Button>
        </div>

        <div className={styles.poolArea}>
          <h3>Jogos não classificados</h3>
          <TierRow
            id={POOL_ID}
            games={games[POOL_ID] ?? []}
            onRemoveGame={(gameId) => removeGameConfirm.open(gameId)}
            selectedGameId={selectedGameId}
            onSelectGame={setSelectedGameId}
          />
        </div>

        <DragOverlay>
          {activeGame && (
            <SortableGame id={activeGame.id} title={activeGame.title} coverUrl={activeGame.coverUrl} />
          )}
        </DragOverlay>
      </DndContext>

      {showSearchModal && (
        <GameSearchModal
          onSelect={(game) => {
            addGameToPool(game);
            setShowSearchModal(false);
          }}
          onClose={() => setShowSearchModal(false)}
          existingGameIds={existingGameIds}
        />
      )}

      <ConfirmModal
        isOpen={removeGameConfirm.isOpen}
        title="Remover Jogo"
        message="Tem certeza que deseja remover este jogo da tier list?"
        confirmText="Sim, remover"
        cancelText="Cancelar"
        isDestructive={true}
        onConfirm={async () => {
          if (removeGameConfirm.target) await removeGame(removeGameConfirm.target);
          removeGameConfirm.close();
        }}
        onCancel={removeGameConfirm.close}
      />

      <ConfirmModal
        isOpen={removeTierConfirm.isOpen}
        title="Remover Tier"
        message="Tem certeza que deseja remover este tier? Os jogos nele voltarão para a área de não classificados."
        confirmText="Sim, remover"
        cancelText="Cancelar"
        isDestructive={true}
        onConfirm={async () => {
          if (removeTierConfirm.target) await removeTier(removeTierConfirm.target);
          removeTierConfirm.close();
        }}
        onCancel={removeTierConfirm.close}
      />
    </div>
  );
}