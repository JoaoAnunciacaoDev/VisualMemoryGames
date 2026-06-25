import { useEffect } from 'react';
import styles from '@/GameModal.module.css';

interface Game {
  title: string;
  coverUrl: string | null;
  releaseYear: number | null;
  platforms: string[];
  genres: string[];
}

interface Props {
  game: Game | null;
  isAdded?: boolean;
  onClose: () => void;
  onAdd?: () => void;
  onRemove?: () => void;
}

export default function GameModal({ game, isAdded, onClose, onAdd, onRemove }: Props) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!game) return null;

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

          <div className={styles.actions}>
            {isAdded && onRemove ? (
              <button className={styles.removeButton} onClick={onRemove}>
                Remover da Biblioteca
              </button>
            ) : onAdd ? (
              <button className={styles.addButton} onClick={onAdd}>
                Adicionar à Biblioteca
              </button>
            ) : null}
          </div>

        </div>
      </div>
    </div>
  );
}