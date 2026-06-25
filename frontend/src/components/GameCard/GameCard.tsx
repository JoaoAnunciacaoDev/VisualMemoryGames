import { useState } from 'react';
import styles from '@/GameCard.module.css';

interface Props {
  title: string;
  coverUrl: string;
  releaseYear: number | null;
  isAdded: boolean;
  onAdd: () => void;
  onRemove: () => void;
  onClick: () => void;
}

export default function GameCard({ title, coverUrl, releaseYear, isAdded, onAdd, onRemove, onClick }: Props) {
  const [isHoveringButton, setIsHoveringButton] = useState(false);

  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAdded) onRemove();
    else onAdd();
  };

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
          className={`${styles.addButton} ${isAdded ? (isHoveringButton ? styles.remove : styles.added) : ''}`}
          onClick={handleButtonClick}
          onMouseEnter={() => setIsHoveringButton(true)}
          onMouseLeave={() => setIsHoveringButton(false)}
        >
          {isAdded ? (isHoveringButton ? '✕ Remover da Biblioteca' : '✓ Adicionado') : 'Adicionar à Biblioteca'}
        </button>
      </div>
    </div>
  );
}