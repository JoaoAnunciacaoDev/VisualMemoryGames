import { useState, useCallback } from 'react';
import {
  DndContext, DragOverlay, PointerSensor, KeyboardSensor,
  useSensor, useSensors, rectIntersection,
  DragStartEvent, DragOverEvent, DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';

import TierRow from '@/components/TierListMaker/TierRow';
import SortableGame from '@/components/TierListMaker/SortableGame';
import GameSearchModal from '@/components/GameSearchModal/GameSearchModal';
import ConfirmModal from '@/components/Shared/ConfirmModal/ConfirmModal';
import Button from '@/components/Shared/Button/Button';
import Input from '@/components/Shared/Input/Input';

import { useConfirmModal } from '@/hooks/useConfirmModal';
import { useTierListEditor, POOL_ID } from '@/hooks/useTierListEditor';

import styles from '@/pages/TierListEditor/TierListEditor.module.css';

export default function TierListEditor() {
  const {
    title, setTitle, tiers, games, setGames, loading,
    existingGameIds, saveTitle, addTier, removeTier,
    updateTierLabel, updateTierColor, addGameToPool,
    removeGame, moveGame, reorderTier,
  } = useTierListEditor();

  const [editingTitle, setEditingTitle] = useState(false);
  const [newTierLabel, setNewTierLabel] = useState('');
  const [newTierColor, setNewTierColor] = useState('#cccccc');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeContainer, setActiveContainer] = useState<string | null>(null);

  const removeGameModal = useConfirmModal();
  const removeTierModal = useConfirmModal();
  const [gameToRemove, setGameToRemove] = useState<string | null>(null);
  const [tierToRemove, setTierToRemove] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const findContainer = useCallback((itemId: string) => {
    if (itemId in games) return itemId;
    return Object.keys(games).find((key) => games[key].some((g) => g.id === itemId));
  }, [games]);

  const handleDragStart = (event: DragStartEvent) => {
    const dragId = event.active.id as string;
    setActiveId(dragId);
    setActiveContainer(findContainer(dragId) ?? null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    const from = findContainer(active.id as string);
    const to = findContainer(over.id as string) ?? (over.id as string);
    if (!from || !to || from === to) return;

    setGames((prev) => {
      const fromItems = [...prev[from]];
      const toItems = [...(prev[to] ?? [])];
      const activeIndex = fromItems.findIndex((g) => g.id === active.id);
      const overIndex = toItems.findIndex((g) => g.id === over.id);
      const newIndex = overIndex >= 0 ? overIndex : toItems.length;
      const item = fromItems[activeIndex];
      return {
        ...prev,
        [from]: fromItems.filter((g) => g.id !== active.id),
        [to]: [...toItems.slice(0, newIndex), item, ...toItems.slice(newIndex)],
      };
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || !activeContainer) { setActiveContainer(null); return; }

    const overContainer = findContainer(over.id as string) ?? (over.id as string);

    if (activeContainer === overContainer) {
      const activeIndex = games[activeContainer].findIndex((g) => g.id === active.id);
      const overIndex = games[overContainer].findIndex((g) => g.id === over.id);
      if (activeIndex !== overIndex) {
        const reordered = arrayMove(games[activeContainer], activeIndex, overIndex);
        setGames((prev) => ({ ...prev, [activeContainer]: reordered }));
        if (activeContainer !== POOL_ID) {
          const itemIds = reordered.filter((g) => g.itemId).map((g) => g.itemId!);
          reorderTier(activeContainer, itemIds);
        }
      }
    } else {
      const overIndex = games[overContainer]?.findIndex((g) => g.id === over.id) ?? games[overContainer]?.length ?? 0;
      await moveGame(active.id as string, activeContainer, overContainer, overIndex);
    }
    setActiveContainer(null);
  };

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

  const requestRemoveGame = (gameId: string) => {
    setGameToRemove(gameId);
    removeGameModal.open();
  };

  const requestRemoveTier = (tierId: string) => {
    setTierToRemove(tierId);
    removeTierModal.open();
  };

  const confirmRemoveGame = async () => {
    if (gameToRemove) await removeGame(gameToRemove);
    setGameToRemove(null);
    removeGameModal.close();
  };

  const confirmRemoveTier = async () => {
    if (tierToRemove) await removeTier(tierToRemove);
    setTierToRemove(null);
    removeTierModal.close();
  };

  const activeGame = activeId
    ? Object.values(games).flat().find((g) => g.id === activeId) ?? null
    : null;

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
              onDelete={() => requestRemoveTier(tier.id)}
              onRemoveGame={(gameId) => requestRemoveGame(gameId)}
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
            onRemoveGame={(gameId) => requestRemoveGame(gameId)}
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
        isOpen={removeGameModal.isOpen}
        title="Remover Jogo"
        message="Tem certeza que deseja remover este jogo da tier list?"
        confirmText="Sim, remover"
        cancelText="Cancelar"
        isDestructive={true}
        onConfirm={confirmRemoveGame}
        onCancel={() => { setGameToRemove(null); removeGameModal.close(); }}
      />

      <ConfirmModal
        isOpen={removeTierModal.isOpen}
        title="Remover Tier"
        message="Tem certeza que deseja remover este tier? Os jogos nele voltarão para a área de não classificados."
        confirmText="Sim, remover"
        cancelText="Cancelar"
        isDestructive={true}
        onConfirm={confirmRemoveTier}
        onCancel={() => { setTierToRemove(null); removeTierModal.close(); }}
      />
    </div>
  );
}