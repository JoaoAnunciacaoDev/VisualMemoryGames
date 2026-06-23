import styles from './GameCard.module.css';

interface Props {
  title: string;
  coverUrl: string;
  releaseYear: number | null;
  isAdded: boolean;
  onAdd: () => void;
  onClick: () => void;
}

export default function GameCard({ title, coverUrl, releaseYear, isAdded, onAdd, onClick }: Props) {
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
      </div>
      <div className={styles.info}>
        <h3 className={styles.title}>{title}</h3>
        {releaseYear && <p className={styles.meta}>{releaseYear}</p>}
        <button
          className={`${styles.addButton} ${isAdded ? styles.added : ''}`}
          onClick={(e) => { e.stopPropagation(); onAdd(); }}
          disabled={isAdded}
        >
          {isAdded ? '✓ Adicionado' : 'Adicionar à Biblioteca'}
        </button>
      </div>
    </div>
  );
}