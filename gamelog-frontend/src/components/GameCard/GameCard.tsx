import styles from './GameCard.module.css';

interface Props {
  title: string;
  coverUrl: string;
  onAdd: () => void;
}

export default function GameCard({ title, coverUrl, onAdd }: Props) {
  return (
    <div className={styles.card}>
      {coverUrl ? (
        <img src={coverUrl} alt={title} className={styles.cover} />
      ) : (
        <div className={styles.coverFallback}>
          <span>Sem Imagem</span>
        </div>
      )}
      <div className={styles.info}>
        <h3 className={styles.title}>{title}</h3>
        <button className={styles.addButton} onClick={onAdd}>
          Adicionar à Biblioteca
        </button>
      </div>
    </div>
  );
}