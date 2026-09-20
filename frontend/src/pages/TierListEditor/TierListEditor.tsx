import { useCallback, useState } from 'react';
import { useLocation, useParams } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';

import { Button, Loader } from '@/components/Shared';

import { useConfirmAction } from '@/hooks/useConfirmAction';
import { useAuth } from '@/hooks/useAuth';
import { useTierListEditor, POOL_ID } from '@/hooks/useTierListEditor';
import { useDragHandlers } from '@/hooks/useDragHandlers';
import { useTierReorder } from '@/hooks/tierListEditor/useTierReorder';
import type { TierListEditorInitialGame } from '@/services/tierlistEditor';
import { tierListEditorQuery } from '@/features/tierlists/queries';

import styles from '@/pages/TierListEditor/TierListEditor.module.css';
import TierListEditorHeader from '@/pages/TierListEditor/TierListEditorHeader';
import TierListEditorBoard from '@/pages/TierListEditor/TierListEditorBoard';
import TierListEditorDialogs from '@/pages/TierListEditor/TierListEditorDialogs';

interface TierListEditorLocationState {
  initialPool?: TierListEditorInitialGame[];
}

export default function TierListEditor() {
  const { id } = useParams({ from: '/tierlists/$id' });
  const location = useLocation();
  const state = location.state as TierListEditorLocationState | null;
  const {
    data: editorData,
    isPending: loading,
    isError,
    refetch: refetchEditor,
  } = useQuery(tierListEditorQuery(id, state?.initialPool ?? []));
  const loadEditor = useCallback(async () => {
    await refetchEditor();
  }, [refetchEditor]);
  const { userId } = useAuth();

  const {
    title, setTitle, isPublic, saveIsPublic, ownerId, ownerUsername, tiers, setTiers, games, setGames,
    existingGameIds, saveTitle, addTier, removeTier,
    updateTierLabel, updateTierColor, addGameToPool,
    removeGame, moveGame, reorderTier,
  } = useTierListEditor(id, editorData ?? null, { onReload: loadEditor });

  const isOwner = editorData ? userId === ownerId : false;

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
  const privacyConfirm = useConfirmAction<boolean>();

  const handleTierDragEnd = useTierReorder({
    tierListId: id,
    tiers,
    setTiers,
    reload: loadEditor,
  });

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

  if (loading) return <Loader />;

  if (isError || !editorData) {
    return (
      <div className={styles.page}>
        <div className={styles.emptyState} role="alert">
          <p>Erro ao carregar tier list.</p>
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
        isPublic={isPublic}
        onTogglePrivacy={() => privacyConfirm.open(!isPublic)}
        isOwner={isOwner}
        ownerUsername={ownerUsername}
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
        onTierDragEnd={handleTierDragEnd}
        readOnly={!isOwner}
      />

      <TierListEditorDialogs
        showSearchModal={showSearchModal}
        existingGameIds={existingGameIds}
        removeGameConfirm={removeGameConfirm}
        removeTierConfirm={removeTierConfirm}
        privacyConfirm={privacyConfirm}
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
        onTogglePrivacy={saveIsPublic}
      />
    </div>
  );
}
