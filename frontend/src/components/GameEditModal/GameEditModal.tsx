import { useState } from 'react';
import Button from '@/components/Button/Button';
import ConfirmModal from '@/components/ConfirmModal/ConfirmModal';
import { resolveImageUrl } from '@/services/media';
import styles from '@/components/GameEditModal/GameEditModal.module.css';
import { LibraryGame } from '@/types/game';
import { STORE_OPTIONS } from '@/types/enums';
import { UpdateLibraryGame } from '@/types/updateGame';

const STATUS_OPTIONS = [
  'Quero Jogar',
  'Jogando',
  'Zerado',
  'Platinado',
  'Abandonado',
  'Em Espera',
];

interface Props {
  game: LibraryGame;
  onSave: (data: Partial<UpdateLibraryGame>) => Promise<void>;
  onRemove: () => Promise<void>;
  onClose: () => void;
}

export default function GameEditModal({
  game,
  onSave,
  onRemove,
  onClose,
}: Props) {
  const [form, setForm] = useState<UpdateLibraryGame>({
    status: game.status,
    rating: game.rating,
    favorite: game.favorite,
    hours_played: game.hours_played,
    store: game.store ?? '',
    acquired_at: game.acquired_at ?? '',
    started_at: game.started_at ?? '',
    finished_at: game.finished_at ?? '',
    platinum_at: game.platinum_at ?? '',
    custom_cover_url: game.custom_cover_url ?? '',
    notes: game.notes ?? '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const canReview = form.status !== 'Quero Jogar';

  const updateField = <K extends keyof UpdateLibraryGame>(
    field: K,
    value: UpdateLibraryGame[K]
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleStatusChange = (newStatus: string) => {
    setForm((prev) => {
      const isWantToPlay = newStatus === 'Quero Jogar';

      return {
        ...prev,
        status: newStatus,
        rating: isWantToPlay ? null : prev.rating,
        finished_at: isWantToPlay ? '' : prev.finished_at,
        notes: isWantToPlay ? '' : prev.notes,
        platinum_at: isWantToPlay ? '' : prev.platinum_at,
      };
    });
  };

  const handleSave = async () => {
    setIsSaving(true);

    const payload: Partial<UpdateLibraryGame> = {
      status: form.status,
      favorite: form.favorite,
      rating: canReview ? form.rating : null,
      started_at: form.started_at || null,
      finished_at: form.finished_at || null,
      acquired_at: form.acquired_at || null,
      platinum_at: form.platinum_at || null,
      store: form.store || null,
      custom_cover_url: form.custom_cover_url || null,
      notes: canReview ? (form.notes || null) : null,
      hours_played: form.hours_played,
    };

    try {
      await onSave(payload);
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
      setShowConfirm(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>
          X
        </button>

        <div className={styles.gameInfo}>
          {game.cover_url && (
            <img
              src={resolveImageUrl(game.cover_url) ?? undefined}
              alt={game.title}
              className={styles.cover}
            />
          )}
          <h2 className={styles.title}>{game.title}</h2>
        </div>

        <div className={styles.fields}>
          
          <div className={styles.dateRow}>
            <label className={styles.label}>
              Status
              <select
                className={styles.select}
                value={form.status}
                onChange={(e) => handleStatusChange(e.target.value)}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.checkboxLabel} style={{ justifyContent: 'flex-start', marginTop: '22px' }}>
              <input
                type="checkbox"
                checked={form.favorite}
                onChange={(e) => updateField('favorite', e.target.checked)}
              />
              Favorito
            </label>
          </div>

          <div className={styles.dateRow}>
            <label className={styles.label}>
              Loja
              <select
                className={styles.select}
                value={form.store ?? ''}
                onChange={(e) => updateField('store', e.target.value)}
              >
                <option value="">Selecione...</option>
                {STORE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.label}>
              Horas jogadas
              <input
                type="number"
                min={0}
                step={0.1}
                className={styles.input}
                value={form.hours_played ?? ''}
                onChange={(e) =>
                  updateField(
                    'hours_played',
                    e.target.value === '' ? null : Number(e.target.value)
                  )
                }
              />
            </label>
          </div>

          {canReview && (
            <>
              <div className={styles.dateRow}>
                <label className={styles.label}>
                  Data de início
                  <input
                    type="date"
                    className={styles.input}
                    value={form.started_at ?? ''}
                    onChange={(e) => updateField('started_at', e.target.value)}
                  />
                </label>

                <label className={styles.label}>
                  Data de conclusão
                  <input
                    type="date"
                    className={styles.input}
                    value={form.finished_at ?? ''}
                    onChange={(e) => updateField('finished_at', e.target.value)}
                  />
                </label>
              </div>

              <div className={styles.dateRow}>
                <label className={styles.label}>
                  Adquirido em
                  <input
                    type="date"
                    className={styles.input}
                    value={form.acquired_at ?? ''}
                    onChange={(e) => updateField('acquired_at', e.target.value)}
                  />
                </label>

                {form.status === 'Platinado' && (
                  <label className={styles.label}>
                    Platinado em
                    <input
                      type="date"
                      className={styles.input}
                      value={form.platinum_at ?? ''}
                      onChange={(e) => updateField('platinum_at', e.target.value)}
                    />
                  </label>
                )}
              </div>

              <label className={styles.label}>
                Sua nota
                <div className={styles.ratingGrid}>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={`${styles.ratingButton} ${
                        form.rating === value ? styles.ratingButtonActive : ''
                      }`}
                      onClick={() => updateField('rating', value)}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </label>

              <label className={styles.label}>
                URL da capa customizada
                <input
                  type="url"
                  className={styles.input}
                  value={form.custom_cover_url ?? ''}
                  onChange={(e) => updateField('custom_cover_url', e.target.value)}
                  placeholder="https://exemplo.com/capa.jpg"
                />
              </label>

              <label className={styles.label}>
                Comentário
                <textarea
                  className={styles.textarea}
                  value={form.notes ?? ''}
                  onChange={(e) => updateField('notes', e.target.value)}
                  placeholder="Escreva um comentário opcional..."
                  rows={2}
                />
              </label>
            </>
          )}
        </div>

        <div className={styles.modalActions}>
          <Button
            onClick={handleSave}
            fullWidth
            disabled={isSaving || isRemoving}
          >
            {isSaving ? 'Salvando...' : 'Salvar'}
          </Button>

          <button
            type="button"
            className={styles.removeButton}
            onClick={() => setShowConfirm(true)}
            disabled={isSaving || isRemoving}
          >
            {isRemoving ? 'Removendo...' : 'Remover da Biblioteca'}
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={showConfirm}
        title="Remover Jogo"
        message={`Tem certeza que deseja remover "${game.title}" da sua biblioteca? Esta ação não pode ser desfeita.`}
        confirmText="Sim, remover"
        cancelText="Cancelar"
        isDestructive={true}
        onConfirm={handleConfirmRemove}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}