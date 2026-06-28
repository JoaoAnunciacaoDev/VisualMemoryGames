import { useCallback, useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';

import Button from '@/components/Shared/Button/Button';

import { useConfirmAction } from '@/hooks/useConfirmAction';
import { useTierListEditor, POOL_ID } from '@/hooks/useTierListEditor';
import { useDragHandlers } from '@/hooks/useDragHandlers';
import {
  loadTierListEditorData,
  type TierListEditorData,
  type TierListEditorInitialGame,
} from '@/services/tierlistEditor';

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
    title, setTitle, tiers, games, setGames,
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