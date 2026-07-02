import type { KeyboardEvent } from 'react';
import Card from '@/components/Shared/Card/Card';
import styles from '@/components/LibraryCard/LibraryCard.module.css';

interface Props {
  title: string;
  coverUrl: string | undefined;
  status: string;
  rating: number | null;
  startedAt: string | null;
  finishedAt: string | null;
  store?: string | null;
  favorite?: boolean;
  onClick: () => void;
}

const STATUS_CLASSES: Record<string, string> = {
  'Quero Jogar': styles.statusWantToPlay,
  'Jogando': styles.statusPlaying,
  'Zerado': styles.statusCompleted,
  'Platinado': styles.statusPlatinized,
  'Abandonado': styles.statusAbandoned,
  'Em Espera': styles.statusOnHold,
};

const getStoreEmoji = (storeName: string): string => {
  const lower = storeName.toLowerCase();
  if (lower.includes('steam')) return '🎮';
  if (lower.includes('epic')) return '🔌';
  if (lower.includes('gog')) return '🟣';
  if (lower.includes('playstation') || lower.includes('ps')) return '💙';
  if (lower.includes('xbox')) return '💚';
  if (lower.includes('nintendo') || lower.includes('switch')) return '❤️';
  return '🛒';
};

export default function LibraryCard({
  title,
  coverUrl,
  status,
  rating,
  startedAt,
  finishedAt,
  store,
  favorite,
  onClick,
}: Props) {
  const year = finishedAt
    ? finishedAt.substring(0, 4)
    : startedAt
    ? startedAt.substring(0, 4)
    : null;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <Card
      className={styles.libraryCard}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Abrir detalhes de ${title}`}
    >
      <div className={styles.imageWrapper}>
        {coverUrl ? (
          <img src={coverUrl} alt={title} className={styles.cover} />
        ) : (
          <div className={styles.coverFallback}>Sem Imagem</div>
        )}
        {store && (
          <div className={styles.storeTag} title={`Adquirido na ${store}`}>
            {getStoreEmoji(store)} {store}
          </div>
        )}
        {favorite && (
          <div className={styles.favoriteBadge} title="Jogo Favorito">
            ⭐
          </div>
        )}
        <span className={`${styles.statusTag} ${STATUS_CLASSES[status] ?? styles.statusWantToPlay}`}>
          {status}
        </span>
      </div>
      <div className={styles.info}>
        <h3 className={styles.title}>{title}</h3>
        <div className={styles.meta}>
          {rating !== null && <span>{rating}/10</span>}
          {year && <span>{year}</span>}
        </div>
      </div>
    </Card>
  );
}