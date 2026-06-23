import { useState, useEffect } from 'react';
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
  initialPlayedYear: number | null;
  initialNotes: string | null;
  onSave: (data: {
    status: string;
    rating: number | null;
    played_year: number | null;
    notes: string | null;
  }) => Promise<void>;
  onRemove?: () => void;
  onClose: () => void;
}

export default function GameEditModal({
  title,
  coverUrl,
  initialStatus,
  initialRating,
  initialPlayedYear,
  initialNotes,
  onSave,
  onRemove,
  onClose,
}: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [rating, setRating] = useState<number | null>(initialRating);
  const [playedYear, setPlayedYear] = useState<number | null>(initialPlayedYear);
  const [notes, setNotes] = useState<string>(initialNotes ?? '');
  const [isSaving, setIsSaving] = useState(false);

  const canReview = status !== 'Quero Jogar';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);

    if (newStatus === 'Quero Jogar') {
      setRating(null);
      setPlayedYear(null);
      setNotes('');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      await onSave({
        status,
        rating: canReview ? rating : null,
        played_year: canReview ? playedYear : null,
        notes: canReview ? (notes || null) : null,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button 
          className={styles.closeButton} 
          onClick={onClose}
          aria-label="Fechar modal"
        >
          X
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

        <div className={styles.actions}>
          <Button
            onClick={handleSave}
            fullWidth
            disabled={isSaving}
          >
            {isSaving ? 'Salvando...' : 'Salvar'}
          </Button>

          {onRemove && (
            <button 
              type="button"
              onClick={onRemove}
              disabled={isSaving}
              className={styles.removeTextButton}
            >
              Remover da Biblioteca
            </button>
          )}
        </div>
      </div>
    </div>
  );
}