import Modal from '@/components/Shared/Modal/Modal';
import Button from '@/components/Shared/Button/Button';
import type { GameDisplay } from '@/types/game';
import styles from '@/components/GameModal/GameModal.module.css';

interface Props {
  game: GameDisplay | null;
  isAdded?: boolean;
  onClose: () => void;
  onAdd?: () => void;
  onRemove?: () => void;
}

export default function GameModal({ game, isAdded, onClose, onAdd, onRemove }: Props) {
  if (!game) return null;

  return (
    <Modal open onClose={onClose} maxWidth="480px" showCloseButton>
      {game.coverUrl && (
        <img src={game.coverUrl} alt={game.title} className={styles.cover} />
      )}

      <div className={styles.content}>
        <h2 className={styles.title}>{game.title}</h2>
        {game.releaseYear && <p className={styles.meta}>📅 {game.releaseYear}</p>}
        {game.genres.length > 0 && <p className={styles.meta}>🎮 {game.genres.join(', ')}</p>}
        {game.platforms.length > 0 && <p className={styles.meta}>🖥️ {game.platforms.join(', ')}</p>}

        <div className={styles.actions}>
          {isAdded && onRemove ? (
            <Button
              variant="ghost"
              fullWidth
              className={styles.removeButton}
              onClick={onRemove}
            >
              Remover da Biblioteca
            </Button>
          ) : onAdd ? (
            <Button variant="primary" fullWidth onClick={onAdd}>
              Adicionar à Biblioteca
            </Button>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}