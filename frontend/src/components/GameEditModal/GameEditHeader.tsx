import type { Dispatch, KeyboardEvent, SetStateAction } from 'react';
import { Pencil, Star, X } from 'lucide-react';
import type { LibraryGame } from '@/types';
import styles from './GameEditModal.module.css';

interface Props {
  game: LibraryGame;
  displayCover: string | null | undefined;
  editTitle: string;
  setEditTitle: Dispatch<SetStateAction<string>>;
  editReleaseYear: string;
  setEditReleaseYear: Dispatch<SetStateAction<string>>;
  status: string | null | undefined;
  favorite: boolean | undefined;
  activeEditField: string | null;
  disabled: boolean;
  closeDisabled: boolean;
  onToggleEditField: (field: string) => void;
  onFavoriteChange: (favorite: boolean) => void;
  onClose: () => void;
}

const activateOnKeyboard = (event: KeyboardEvent, action: () => void) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    action();
  }
};

export default function GameEditHeader({
  game,
  displayCover,
  editTitle,
  setEditTitle,
  editReleaseYear,
  setEditReleaseYear,
  status,
  favorite,
  activeEditField,
  disabled,
  closeDisabled,
  onToggleEditField,
  onFavoriteChange,
  onClose,
}: Props) {
  const resolvedStatus = status || 'Na biblioteca';

  return (
    <div className={styles.customHeader}>
      <div className={styles.gameInfo}>
        <button
          type="button"
          className={styles.coverWrapper}
          onClick={() => onToggleEditField('cover')}
          disabled={disabled}
          aria-label="Alterar capa"
        >
          {displayCover
            ? <img src={displayCover} alt={game.title} className={styles.cover} />
            : <span className={styles.coverPlaceholderSmall}>Sem capa</span>}
          <span className={styles.coverHoverOverlay}>
            <span className={styles.coverPencilIcon}><Pencil aria-hidden="true" /></span>
            <span className={styles.coverHoverTooltip}>Alterar capa</span>
          </span>
        </button>

        <div className={styles.titleAndStatus}>
          {game.is_manual ? activeEditField === 'title' ? (
            <input
              type="text"
              className={styles.headerTitleInput}
              value={editTitle}
              onChange={(event) => setEditTitle(event.target.value)}
              onBlur={() => onToggleEditField('title')}
              onKeyDown={(event) => {
                if (event.key === 'Enter') onToggleEditField('title');
              }}
              disabled={disabled}
              aria-label="Título do jogo"
              autoFocus
            />
          ) : (
            <h2
              className={`${styles.title} ${styles.editableHeaderField}`}
              onClick={() => onToggleEditField('title')}
              onKeyDown={(event) => activateOnKeyboard(event, () => onToggleEditField('title'))}
              role="button"
              tabIndex={0}
              aria-label="Editar título do jogo"
            >
              {editTitle}
            </h2>
          ) : <h2 className={styles.title}>{game.title}</h2>}

          {game.is_manual ? activeEditField === 'release_year' ? (
            <input
              type="number"
              className={styles.headerYearInput}
              value={editReleaseYear}
              onChange={(event) => setEditReleaseYear(event.target.value)}
              onBlur={() => onToggleEditField('release_year')}
              onKeyDown={(event) => {
                if (event.key === 'Enter') onToggleEditField('release_year');
              }}
              min={1}
              max={new Date().getFullYear() + 10}
              disabled={disabled}
              aria-label="Ano de lançamento"
              autoFocus
            />
          ) : (
            <span
              className={`${styles.headerYear} ${styles.editableHeaderField}`}
              onClick={() => onToggleEditField('release_year')}
              onKeyDown={(event) => activateOnKeyboard(event, () => onToggleEditField('release_year'))}
              role="button"
              tabIndex={0}
              aria-label="Editar ano de lançamento"
            >
              {editReleaseYear || 'Adicionar ano'}
            </span>
          ) : game.release_year ? <span className={styles.headerYear}>{game.release_year}</span> : null}

          <span className={`${styles.statusTag} ${styles[`status_${resolvedStatus.replace(/\s+/g, '_')}`]}`}>
            {resolvedStatus.toUpperCase()}
          </span>
        </div>
      </div>

      <div className={styles.headerActions}>
        <button
          type="button"
          className={styles.favoriteHeaderBtn}
          onClick={() => onFavoriteChange(!favorite)}
          disabled={disabled}
          aria-label={favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          title={favorite ? 'Remover dos Favoritos' : 'Adicionar aos Favoritos'}
        >
          <Star aria-hidden="true" fill={favorite ? 'currentColor' : 'none'} />
        </button>
        <button
          type="button"
          className={styles.closeHeaderBtn}
          onClick={onClose}
          disabled={closeDisabled}
          aria-label="Fechar"
          title="Fechar"
        >
          <X aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
