import styles from './GameModal.module.css';

interface Game {
  title: string;
  coverUrl: string;
  releaseYear: number | null;
  platforms: string[];
  genres: string[];
}

interface Props {
  game: Game | null;
  onClose: () => void;
}

export default function GameModal({ game, onClose }: Props) {
  if (!game) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>✕</button>
        {game.coverUrl && (
          <img src={game.coverUrl} alt={game.title} className={styles.cover} />
        )}
        <div className={styles.content}>
          <h2 className={styles.title}>{game.title}</h2>
          {game.releaseYear && <p className={styles.meta}>📅 {game.releaseYear}</p>}
          {game.genres.length > 0 && (
            <p className={styles.meta}>🎮 {game.genres.join(', ')}</p>
          )}
          {game.platforms.length > 0 && (
            <p className={styles.meta}>🖥️ {game.platforms.join(', ')}</p>
          )}
        </div>
      </div>
    </div>
  );
}