import RatingStars from '@/components/RatingStars/RatingStars';
import styles from './GameEditModal.module.css';

interface Props {
  rating: number | null | undefined;
  canReview: boolean;
  disabled: boolean;
  onChange: (rating: number | null) => void;
}

export default function GameRatingField({ rating, canReview, disabled, onChange }: Props) {
  return (
    <div className={styles.ratingCardBox}>
      <span className={styles.ratingBoxSubtitle}>Sua nota</span>
      {canReview ? (
        <div className={styles.ratingStarsArea}>
          <RatingStars value={rating ?? null} onChange={onChange} disabled={disabled} />
          <div className={styles.ratingValueLabel}>{rating !== null && rating !== undefined ? `${rating.toFixed(1)} / 10` : 'Sem nota'}</div>
          {rating !== null && rating !== undefined && (
            <button type="button" className={styles.clearRatingBtn} onClick={() => onChange(null)} disabled={disabled}>Remover nota</button>
          )}
        </div>
      ) : <div className={styles.disabledRatingArea}>Mude o status para avaliar</div>}
    </div>
  );
}
