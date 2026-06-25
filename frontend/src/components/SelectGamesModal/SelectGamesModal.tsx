import { useState } from 'react';
import styles from '@/components/SelectGamesModal/SelectGamesModal.module.css';

interface LibraryGame {
  game_id: string;
  title: string;
  cover_url: string | null;
}

interface Props {
  games: LibraryGame[];
  alreadyInList: Set<string>;
  onConfirm: (selectedIds: string[]) => void;
  onClose: () => void;
}

export default function SelectGamesModal({ games, alreadyInList, onConfirm, onClose }: Props) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = games.filter(
    (g) => !alreadyInList.has(g.game_id) &&
    g.title.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (gameId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(gameId)) next.delete(gameId);
      else next.add(gameId);
      return next;
    });
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>Adicionar Jogos à Lista</h3>
          <button className={styles.closeButton} onClick={onClose}>✕</button>
        </div>

        <input
          type="text"
          placeholder="Pesquisar jogo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
          autoFocus
        />

        <div className={styles.count}>
          {selected.size > 0 && `${selected.size} jogo(s) selecionado(s)`}
        </div>

        <div className={styles.gameList}>
          {filtered.length === 0 ? (
            <p className={styles.empty}>
              {games.length === alreadyInList.size
                ? 'Todos os jogos da biblioteca já estão nesta lista.'
                : 'Nenhum jogo encontrado.'}
            </p>
          ) : (
            filtered.map((game) => {
              const isSelected = selected.has(game.game_id);
              return (
                <div
                  key={game.game_id}
                  className={`${styles.gameItem} ${isSelected ? styles.gameSelected : ''}`}
                  onClick={() => toggleSelect(game.game_id)}
                >
                  {game.cover_url ? (
                    <img src={game.cover_url} alt={game.title} className={styles.cover} />
                  ) : (
                    <div className={styles.noCover}>
                      {game.title.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <span className={styles.title}>{game.title}</span>
                  <div className={`${styles.checkbox} ${isSelected ? styles.checked : ''}`}>
                    {isSelected && '✓'}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelButton} onClick={onClose}>
            Cancelar
          </button>
          <button
            className={styles.confirmButton}
            onClick={() => onConfirm(Array.from(selected))}
            disabled={selected.size === 0}
          >
            Adicionar {selected.size > 0 ? `(${selected.size})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}