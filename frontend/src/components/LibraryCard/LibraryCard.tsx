import styles from '@/LibraryCard.module.css';

interface Props {
  title: string;
  coverUrl: string | null;
  status: string;
  rating: number | null;
  startedAt: string | null;
  finishedAt: string | null; 
  onClick: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  'Quero Jogar': '#6c757d',
  'Jogando':     '#007BFF',
  'Zerado':      '#28a745',
  'Platinado':   '#a855f7',
  'Abandonado':  '#dc3545',
  'Em Espera':   '#fd7e14',
};

export default function LibraryCard({ title, coverUrl, status, rating, startedAt, finishedAt, onClick }: Props) {
  const year = finishedAt
    ? new Date(finishedAt).getFullYear()
    : startedAt
    ? new Date(startedAt).getFullYear()
    : null;

  return (
    <div className={styles.card} onClick={onClick}>
      <div className={styles.imageWrapper}>
        {coverUrl ? (
          <img src={coverUrl} alt={title} className={styles.cover} />
        ) : (
          <div className={styles.coverFallback}>
            <span>Sem Imagem</span>
          </div>
        )}
        <span
          className={styles.statusTag}
          style={{ backgroundColor: STATUS_COLORS[status] ?? '#6c757d' }}
        >
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
    </div>
  );
}