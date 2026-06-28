import { useState } from 'react';
import { resolveImageUrl } from '@/services/media';
import Modal from '@/components/Shared/Modal/Modal';
import Input from '@/components/Shared/Input/Input';
import Button from '@/components/Shared/Button/Button';
import styles from '@/components/SelectGamesModal/SelectGamesModal.module.css';
import type { LibraryGame } from '@/types';

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
    <Modal open onClose={onClose} maxWidth="500px" showCloseButton>
      <div className={styles.header}>
        <h3>Adicionar Jogos à Lista</h3>
      </div>

      <div className={styles.searchWrapper}>
        <Input
          type="text"
          aria-label="Pesquisar jogo na biblioteca"
          placeholder="Pesquisar jogo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
      </div>

      <div className={styles.count}>
        {selected.size > 0 && `${selected.size} jogo(s) selecionado(s)`}
      </div>

      <div className={`${styles.gameList} scrollbar-gamelog`}>
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
              <button
                type="button"
                key={game.game_id}
                className={`${styles.gameItem} ${isSelected ? styles.gameSelected : ''}`}
                onClick={() => toggleSelect(game.game_id)}
                aria-pressed={isSelected}
                aria-label={`${isSelected ? 'Desselecionar' : 'Selecionar'} ${game.title}`}
              >
                {game.cover_url ? (
                  <img src={resolveImageUrl(game.cover_url) ?? ''} alt={game.title} className={styles.cover} />
                ) : (
                  <div className={styles.noCover}>
                    {game.title.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <span className={styles.title}>{game.title}</span>
                <div className={`${styles.checkbox} ${isSelected ? styles.checked : ''}`}>
                  {isSelected && '✓'}
                </div>
              </button>
            );
          })
        )}
      </div>

      <div className={styles.footer}>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          onClick={() => onConfirm(Array.from(selected))}
          disabled={selected.size === 0}
        >
          Adicionar {selected.size > 0 ? `(${selected.size})` : ''}
        </Button>
      </div>
    </Modal>
  );
}