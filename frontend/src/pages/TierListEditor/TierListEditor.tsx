import { useCallback, useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { arrayMove } from '@dnd-kit/sortable';
import type { DragEndEvent } from '@dnd-kit/core';

import Button from '@/components/Shared/Button/Button';

import { useConfirmAction } from '@/hooks/useConfirmAction';
import { useTierListEditor, POOL_ID } from '@/hooks/useTierListEditor';
import { useDragHandlers } from '@/hooks/useDragHandlers';
import {
  loadTierListEditorData,
  type TierListEditorData,
  type TierListEditorInitialGame,
} from '@/services/tierlistEditor';
import api from '@/services/api';

import styles from '@/pages/TierListEditor/TierListEditor.module.css';
import TierListEditorHeader from '@/pages/TierListEditor/TierListEditorHeader';
import TierListEditorBoard from '@/pages/TierListEditor/TierListEditorBoard';
import TierListEditorDialogs from '@/pages/TierListEditor/TierListEditorDialogs';

interface TierListEditorLocationState {
  initialPool?: TierListEditorInitialGame[];
}

export default function TierListEditor() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [editorData, setEditorData] = useState<TierListEditorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEditor = useCallback(async () => {
    if (!id) {
      setError('Tier list não encontrada.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const state = location.state as TierListEditorLocationState | null;
      const data = await loadTierListEditorData(id, state?.initialPool ?? []);
      setEditorData(data);
    } catch {
      setError('Erro ao carregar tier list.');
    } finally {
      setLoading(false);
    }
  }, [id, location.state]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadEditor();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [loadEditor]);

  const {
    title, setTitle, tiers, setTiers, games, setGames,
    existingGameIds, saveTitle, addTier, removeTier,
    updateTierLabel, updateTierColor, addGameToPool,
    removeGame, moveGame, reorderTier,
  } = useTierListEditor(id, editorData, { onReload: loadEditor });

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

  // --- Handlers de arrasto de tiers ---
  const handleTierDragStart = useCallback(() => {
    // Pode ser usado para feedback visual futuro
  }, []);

  const handleTierDragOver = useCallback(() => {
    // A animação visual é gerida automaticamente pelo SortableContext
  }, []);

  const handleTierDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = tiers.findIndex((t) => t.id === active.id);
    const newIndex = tiers.findIndex((t) => t.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Atualização otimista da UI
    const reordered = arrayMove(tiers, oldIndex, newIndex);
    setTiers(reordered);

    // Persistir no backend
    const newOrderIds = reordered.map((t) => t.id);
    try {
      await api.put(`/tierlists/${id}/categories/reorder`, { category_ids: newOrderIds });
    } catch {
      // Em caso de erro, recarrega os dados originais
      loadEditor();
    }
  }, [tiers, id, loadEditor, setTiers]);
  // Fim dos handlers de tiers

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

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.emptyState} role="alert">
          <p>{error}</p>
          <Button variant="primary" onClick={loadEditor}>
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page} onClick={() => setSelectedGameId(null)}>
      <TierListEditorHeader
        title={title}
        editingTitle={editingTitle}
        onEditTitle={() => setEditingTitle(true)}
        onTitleChange={setTitle}
        onTitleSave={handleTitleSave}
        onAddGame={() => setShowSearchModal(true)}
      />

      <TierListEditorBoard
        tiers={tiers}
        games={games}
        poolGames={games[POOL_ID] ?? []}
        selectedGameId={selectedGameId}
        newTierLabel={newTierLabel}
        newTierColor={newTierColor}
        activeGame={activeGame}
        onSelectedGameChange={setSelectedGameId}
        onNewTierLabelChange={setNewTierLabel}
        onNewTierColorChange={setNewTierColor}
        onAddTier={handleAddTier}
        onRemoveGame={removeGameConfirm.open}
        onRemoveTier={removeTierConfirm.open}
        onUpdateTierLabel={updateTierLabel}
        onUpdateTierColor={updateTierColor}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onTierDragStart={handleTierDragStart}
        onTierDragOver={handleTierDragOver}
        onTierDragEnd={handleTierDragEnd}
      />

      <TierListEditorDialogs
        showSearchModal={showSearchModal}
        existingGameIds={existingGameIds}
        removeGameConfirm={removeGameConfirm}
        removeTierConfirm={removeTierConfirm}
        onAddGame={async (game) => {
          await addGameToPool(game);
          setShowSearchModal(false);
        }}
        onCloseSearchModal={() => setShowSearchModal(false)}
        onRemoveGame={async (gameId) => {
          await removeGame(gameId);
        }}
        onRemoveTier={async (tierId) => {
          await removeTier(tierId);
        }}
      />
    </div>
  );
}