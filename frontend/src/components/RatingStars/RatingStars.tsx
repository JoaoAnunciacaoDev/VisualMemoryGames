import { useState } from 'react';
import styles from './RatingStars.module.css';

interface Props {
  value: number | null;
  onChange: (value: number) => void;
  max?: number;
}

export default function RatingStars({
  value = 0,
  onChange,
  max = 10,
}: Props) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const displayValue = hoverValue ?? value ?? 0;

  return (
    <div
        className={styles.container}
        onMouseLeave={() => setHoverValue(null)}
    >
        {Array.from({ length: max }).map((_, index) => {
        const starValue = index + 1;
        const filled = displayValue >= starValue;
        const half =
            displayValue >= starValue - 0.5 &&
            displayValue < starValue;

        return (
            <button
            key={starValue}
            type="button"
            className={`${styles.star} ${
                filled ? styles.full : half ? styles.half : ''
            }`}
            aria-label={`${starValue} estrela${starValue > 1 ? 's' : ''}`}
            onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const isHalf = e.clientX - rect.left < rect.width / 2;
                setHoverValue(starValue - (isHalf ? 0.5 : 0));
            }}
            onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const isHalf = e.clientX - rect.left < rect.width / 2;
                onChange(starValue - (isHalf ? 0.5 : 0));
            }}
            >
            ★
            </button>
        );
        })}

        <span className={styles.value}>
        {displayValue.toFixed(1)}
        </span>
    </div>
    );
}