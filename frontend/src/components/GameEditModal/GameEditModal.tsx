import { useState } from 'react';
import Button from '@/components/Shared/Button/Button';
import ConfirmModal from '@/components/Shared/ConfirmModal/ConfirmModal';
import Input from '@/components/Shared/Input/Input';
import Modal from '@/components/Shared/Modal/Modal';
import { useConfirmAction } from '@/hooks/useConfirmAction';
import { useGameEditForm } from '@/hooks/useGameEditForm';
import styles from '@/components/GameEditModal/GameEditModal.module.css';
import { LibraryGame } from '@/types/game';
import { STORE_OPTIONS } from '@/types/enums';
import { EditGamePayload } from '@/hooks/useGameEditForm';
import RatingStars from '@/components/RatingStars/RatingStars';

const STATUS_OPTIONS = [
  'Quero Jogar', 'Jogando', 'Zerado', 'Platinado', 'Abandonado', 'Em Espera',
];

interface Props {
  game: LibraryGame;
  onSave: (data: EditGamePayload) => Promise<void>;
  onRemove: () => Promise<void>;
  onClose: () => void;
}

export default function GameEditModal({ game, onSave, onRemove, onClose }: Props) {
  const {
  form,
  coverFile,
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

  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const confirmRemoveModal = useConfirmAction();

  const onSaveHandler = async () => {
    setIsSaving(true);
    try {
      const payload = await handleSave();
      await onSave(payload);
    } catch {
      // opcional: showToast
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmRemove = async () => {
    setIsRemoving(true);
    try {
      await onRemove();
    } finally {
      setIsRemoving(false);
      confirmRemoveModal.close();
    }
  };

  return (
    <Modal open onClose={onClose} maxWidth="720px" showCloseButton>
      <div className={styles.modalContent}>
        <div className={styles.gameInfo}>
          {displayCover && (
            <img src={displayCover} alt={game.title} className={styles.cover} />
          )}
          <h2 className={styles.title}>{game.title}</h2>
        </div>

        <div className={`${styles.fields} scrollbar-gamelog`}>
          {game.is_manual && (
            <>
              <div className={styles.dateRow}>
                <label className={styles.label}>
                  Nome do jogo
                  <Input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                </label>
                <label className={styles.label}>
                  Ano de lançamento
                  <Input type="number" value={editReleaseYear} onChange={(e) => setEditReleaseYear(e.target.value)} min={1970} max={new Date().getFullYear() + 2} />
                </label>
              </div>
              <div className={styles.dateRow}>
                <label className={styles.label}>
                  Plataformas
                  <Input type="text" placeholder="PC, PlayStation 5" value={editPlatforms} onChange={(e) => setEditPlatforms(e.target.value)} />
                </label>
                <label className={styles.label}>
                  Géneros
                  <Input type="text" placeholder="RPG, Ação" value={editGenres} onChange={(e) => setEditGenres(e.target.value)} />
                </label>
              </div>
            </>
          )}

          <div className={styles.dateRow}>
            <label className={styles.label}>
              Status
              <select className={styles.select} value={form.status} onChange={(e) => handleStatusChange(e.target.value)}>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className={styles.checkboxLabel}>
              <input type="checkbox" checked={form.favorite} onChange={(e) => updateField('favorite', e.target.checked)} />
              Favorito
            </label>
          </div>

          <div className={styles.dateRow}>
            <label className={styles.label}>
              Loja
              <select className={styles.select} value={form.store ?? ''} onChange={(e) => updateField('store', e.target.value)}>
                <option value="">Selecione...</option>
                {STORE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className={styles.label}>
              Adquirido em
              <input type="date" className={styles.input} value={form.acquired_at ?? ''} onChange={(e) => updateField('acquired_at', e.target.value)} />
            </label>
          </div>

          {canReview && (
            <>
              <div className={styles.dateRow}>
                <label className={styles.label}>
                  Data de início
                  <input type="date" className={styles.input} value={form.started_at ?? ''} onChange={(e) => updateField('started_at', e.target.value)} />
                </label>
                {(form.status === 'Zerado' || form.status === 'Platinado') && (
                  <label className={styles.label}>
                    Data de conclusão
                    <input type="date" className={styles.input} value={form.finished_at ?? ''} onChange={(e) => updateField('finished_at', e.target.value)} />
                  </label>
                )}
              </div>

              {form.status === 'Platinado' && (
                <div className={styles.dateRow}>
                  <label className={styles.label}>
                    Platinado em
                    <input type="date" className={styles.input} value={form.platinum_at ?? ''} onChange={(e) => updateField('platinum_at', e.target.value)} />
                  </label>
                </div>
              )}

              <label className={styles.label}>
                Horas jogadas
                <input type="number" min={0} step={0.1} className={styles.input} value={form.hours_played ?? ''} onChange={(e) => updateField('hours_played', e.target.value === '' ? null : Number(e.target.value))} />
              </label>

              <label className={styles.label}>
                Sua nota

                <RatingStars
                  value={form.rating ?? 0}
                  onChange={(value: number) => updateField('rating', value)}
                />
              </label>

              <label className={styles.label}>
                Comentário
                <textarea className={styles.textarea} value={form.notes ?? ''} onChange={(e) => updateField('notes', e.target.value)} placeholder="Escreva um comentário opcional..." rows={2} />
              </label>
            </>
          )}

          <div className={styles.coverSection}>
            <label className={styles.label}>
              Capa customizada (URL)
              <input type="url" className={styles.input} value={form.custom_cover_url ?? ''} onChange={handleUrlChange} placeholder="https://exemplo.com/capa.jpg" disabled={!!coverFile} />
            </label>
            <div className={styles.orDivider}>ou</div>
            <label className={styles.fileLabel}>
              {coverFile ? coverFile.name : 'Escolher arquivo do PC'}
              <input type="file" accept="image/*" onChange={handleFileChange} className={styles.fileInput} />
            </label>
            {coverFile && (
              <button type="button" className={styles.clearFile} onClick={() => { clearCoverFile(); }}>
                Remover arquivo
              </button>
            )}
          </div>
        </div>

        <div className={styles.footer}>
          <Button variant="primary" onClick={onSaveHandler} fullWidth disabled={isSaving || isRemoving}>
            {isSaving ? 'Salvando...' : 'Salvar'}
          </Button>
          <button type="button" className={styles.removeButton} onClick={() => confirmRemoveModal.open()} disabled={isSaving || isRemoving}>
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
        isDestructive={true}
        onConfirm={handleConfirmRemove}
        onCancel={confirmRemoveModal.close}
      />
    </Modal>
  );
}