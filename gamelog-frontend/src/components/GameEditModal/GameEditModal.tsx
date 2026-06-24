import { useState } from 'react';
import Button from '../Button/Button';
import styles from './GameEditModal.module.css';

const STATUS_OPTIONS = [
  'Quero Jogar',
  'Jogando',
  'Zerado',
  'Platinado',
  'Abandonado',
  'Em Espera',
];

interface Props {
  userGameId: string;
  title: string;
  coverUrl: string | null;
  initialStatus: string;
  initialRating: number | null;
  initialStartedAt: string | null;
  initialFinishedAt: string | null;
  initialNotes: string | null;
  onSave: (data: {
    status: string;
    rating: number | null;
    started_at: string | null;
    finished_at: string | null;
    notes: string | null;
  }) => Promise<void>;
  onClose: () => void;
}

export default function GameEditModal({
  title,
  coverUrl,
  initialStatus,
  initialRating,
  initialStartedAt,
  initialFinishedAt,
  initialNotes,
  onSave,
  onClose,
}: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [rating, setRating] = useState<number | null>(initialRating);
  const [startedAt, setStartedAt] = useState(initialStartedAt ?? '');
  const [finishedAt, setFinishedAt] = useState(initialFinishedAt ?? '');
  const [notes, setNotes] = useState(initialNotes ?? '');
  const [isSaving, setIsSaving] = useState(false);

  const canReview = status !== 'Quero Jogar';

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);

    if (newStatus === 'Quero Jogar') {
      setRating(null);
      setFinishedAt('');
      setNotes('');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      await onSave({
        status,
        rating: canReview ? rating : null,
        started_at: startedAt || null,
        finished_at: finishedAt || null,
        notes: canReview ? (notes || null) : null,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>
          ✕
        </button>

        <div className={styles.gameInfo}>
          {coverUrl && (
            <img
              src={coverUrl}
              alt={title}
              className={styles.cover}
            />
          )}

          <h2 className={styles.title}>{title}</h2>
        </div>

        <div className={styles.fields}>
          <label className={styles.label}>
            Status
            <select
              className={styles.select}
              value={status}
              onChange={(e) => handleStatusChange(e.target.value)}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          {canReview && (
            <>
              <div className={styles.dateRow}>
                <label className={styles.label}>
                  Data de início
                  <input
                    type="date"
                    className={styles.input}
                    value={startedAt}
                    onChange={(e) => setStartedAt(e.target.value)}
                  />
                </label>

                <label className={styles.label}>
                  Data de conclusão
                  <input
                    type="date"
                    className={styles.input}
                    value={finishedAt}
                    onChange={(e) => setFinishedAt(e.target.value)}
                  />
                </label>
              </div>


              <label className={styles.label}>
                Sua nota

                <div className={styles.ratingGrid}>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={`${styles.ratingButton} ${
                        rating === value ? styles.ratingButtonActive : ''
                      }`}
                      onClick={() => setRating(value)}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </label>

              <label className={styles.label}>
                Comentário
                <textarea
                  className={styles.textarea}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Escreva um comentário opcional..."
                  rows={3}
                />
              </label>
            </>
          )}
        </div>

        <Button
          onClick={handleSave}
          fullWidth
          disabled={isSaving}
        >
          {isSaving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </div>
  );
}