import { useEffect, useState } from 'react';
import axios from 'axios';
import Button from '@/components/Shared/Button/Button';
import ConfirmModal from '@/components/Shared/ConfirmModal/ConfirmModal';
import Modal from '@/components/Shared/Modal/Modal';
import { useConfirmAction } from '@/hooks/useConfirmAction';
import { type EditGamePayload, useGameEditForm } from '@/hooks/useGameEditForm';
import { useToast } from '@/hooks/useToast';
import type { LibraryGame } from '@/types';
import styles from './GameEditModal.module.css';
import CoverEditor from './CoverEditor';
import GameDateFields from './GameDateFields';
import GameEditHeader from './GameEditHeader';
import GameMetadataFields from './GameMetadataFields';
import GameProgressFields from './GameProgressFields';
import GameRatingField from './GameRatingField';
import GameReviewsSection from './GameReviewsSection';
import { useGameReviews } from './useGameReviews';

interface Props {
  game: LibraryGame;
  onSave: (data: EditGamePayload) => Promise<void>;
  onRemove: () => Promise<void>;
  onClose: () => void;
}

export default function GameEditModal({ game, onSave, onRemove, onClose }: Props) {
  const { showToast } = useToast();
  const {
    form,
    coverFile,
    fileError,
    editTitle,
    setEditTitle,
    editReleaseYear,
    setEditReleaseYear,
    editPlatforms,
    setEditPlatforms,
    editGenres,
    setEditGenres,
    canReview,
    updateField,
    handleStatusChange,
    handleFileChange,
    handleUrlChange,
    clearCoverFile,
    handleSave,
    displayCover,
  } = useGameEditForm(game);
  const [activeEditField, setActiveEditField] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const confirmRemoveModal = useConfirmAction();

  const toggleEditField = (field: string) => {
    setActiveEditField((currentField) => currentField === field ? null : field);
  };

  const reviewsController = useGameReviews({
    userGameId: game.id,
    rating: form.rating,
    onAllDeleted: () => {
      updateField('rating', null);
      updateField('notes', null);
    },
  });

  useEffect(() => {
    const latest = reviewsController.latestReview;
    if (latest) {
      updateField('rating', latest.rating);
      updateField('notes', latest.notes);
    }
  }, [reviewsController.latestReview, updateField]);

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      await onSave(await handleSave());
    } catch (error) {
      let message = 'Erro ao salvar alterações.';
      if (axios.isAxiosError(error)) {
        const detail = error.response?.data?.detail;
        if (typeof detail === 'string') message = detail;
        else if (Array.isArray(detail)) message = detail.map((item: { msg?: string }) => item.msg || '').join('\n');
        else if (error.response?.data?.message) message = error.response.data.message;
        else if (error.message) message = error.message;
      } else if (error instanceof Error) {
        message = error.message;
      }
      showToast(message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmRemove = async () => {
    setIsRemoving(true);
    try {
      await onRemove();
    } catch {
      showToast('Erro ao remover jogo.', 'error');
    } finally {
      setIsRemoving(false);
      confirmRemoveModal.close();
    }
  };

  const isBusy = isSaving || isRemoving || reviewsController.isMutating || reviewsController.isLoading;

  return (
    <Modal open onClose={() => !isBusy && onClose()} maxWidth="720px" showCloseButton={false}>
      <div className={styles.modalContent}>
        <GameEditHeader
          game={game}
          displayCover={displayCover}
          editTitle={editTitle}
          setEditTitle={setEditTitle}
          editReleaseYear={editReleaseYear}
          setEditReleaseYear={setEditReleaseYear}
          status={form.status}
          favorite={form.favorite}
          activeEditField={activeEditField}
          disabled={isBusy}
          closeDisabled={isSaving || isRemoving}
          onToggleEditField={toggleEditField}
          onFavoriteChange={(favorite) => updateField('favorite', favorite)}
          onClose={onClose}
        />

        <div className={`${styles.fields} scrollbar-visualmemory`}>
          {activeEditField === 'cover' && (
            <CoverEditor
              coverUrl={form.custom_cover_url ?? ''}
              coverFile={coverFile}
              fileError={fileError}
              disabled={isBusy}
              onUrlChange={handleUrlChange}
              onFileChange={handleFileChange}
              onClearFile={clearCoverFile}
              onClose={() => setActiveEditField(null)}
            />
          )}

          <GameProgressFields form={form} canReview={canReview} activeEditField={activeEditField} disabled={isBusy} onToggleEditField={toggleEditField} onStatusChange={handleStatusChange} onFieldChange={updateField} />
          <GameDateFields form={form} canReview={canReview} activeEditField={activeEditField} disabled={isBusy} onToggleEditField={toggleEditField} onFieldChange={updateField} />
          <GameRatingField rating={form.rating} canReview={canReview} disabled={isBusy} onChange={(rating) => updateField('rating', rating)} />
          <GameMetadataFields
            platforms={editPlatforms}
            genres={editGenres}
            editable={game.is_manual}
            activeEditField={activeEditField}
            disabled={isBusy}
            onToggleEditField={toggleEditField}
            onPlatformsChange={setEditPlatforms}
            onGenresChange={setEditGenres}
          />
          {canReview && <GameReviewsSection controller={reviewsController} rating={form.rating} disabled={isBusy} />}
        </div>

        <div className={styles.footer}>
          <Button variant="primary" onClick={() => void handleSubmit()} fullWidth disabled={isBusy} className={styles.gradientSaveBtn}>
            {isSaving ? 'Salvando...' : 'Salvar'}
          </Button>
          <button type="button" className={styles.removeButton} onClick={() => confirmRemoveModal.open()} disabled={isBusy}>
            {isRemoving ? 'Removendo...' : 'Remover da Biblioteca'}
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmRemoveModal.isOpen}
        title="Remover Jogo"
        message={`Tem certeza que deseja remover "${game.title}" da sua biblioteca? Esta ação não pode ser desfeita.`}
        confirmText="Sim, remover"
        cancelText="Cancelar"
        isDestructive
        onConfirm={() => void handleConfirmRemove()}
        onCancel={confirmRemoveModal.close}
      />
    </Modal>
  );
}
