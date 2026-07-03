import { useState } from 'react';
import api from '@/services/api';
import { getBestGameCover } from '@/services/media';
import Modal from '@/components/Shared/Modal/Modal';
import Input from '@/components/Shared/Input/Input';
import Button from '@/components/Shared/Button/Button';
import { useToast } from '@/hooks/useToast';
import { ensureGameRecord } from '@/services/gameCatalog';
import styles from '@/components/GameSearchModal/GameSearchModal.module.css';
import { GameResult } from '@/types';

interface Props {
  onSelect: (game: { id: string; title: string; coverUrl: string | null }) => void;
  onClose: () => void;
  existingGameIds: Set<string>;
}

export default function GameSearchModal({ onSelect, onClose, existingGameIds }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GameResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { showToast } = useToast();

  const handleSearch = async () => {
    if (query.trim().length < 3) return;
    setIsSearching(true);
    try {
      const response = await api.get('/games/search', { params: { q: query } });
      setResults(response.data);
    } catch {
      showToast('Erro ao buscar jogos.', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelect = async (game: GameResult) => {
    try {
      const gameId = await ensureGameRecord({
        ...game,
        release_year: null,
      });
      onSelect({ id: gameId, title: game.title, coverUrl: game.cover_url });
    } catch {
      showToast('Erro ao adicionar jogo.', 'error');
    }
  };

  return (
    <Modal open onClose={onClose} maxWidth="500px" showCloseButton>
      <div className={styles.header}>
        <h3>Adicionar Jogo</h3>
      </div>

      <div className={styles.searchRow}>
        <Input
          type="text"
          aria-label="Pesquisar jogo para adicionar"
          placeholder="Pesquisar jogo..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          autoFocus
        />
        <Button
          variant="primary"
          onClick={handleSearch}
          disabled={isSearching || query.trim().length < 3}
          className={styles.searchButton}
        >
          {isSearching ? '...' : 'Buscar'}
        </Button>
      </div>

      <div className={`${styles.results} scrollbar-visualmemory`}>
        {results.map((game) => {
          const alreadyAdded = existingGameIds.has(String(game.external_id));
          return (
            <button
              type="button"
              key={game.external_id}
              className={`${styles.resultItem} ${alreadyAdded ? styles.alreadyAdded : ''}`}
              onClick={() => !alreadyAdded && handleSelect(game)}
              disabled={alreadyAdded}
              aria-pressed={alreadyAdded}
              aria-label={alreadyAdded ? `${game.title} já está adicionado` : `Adicionar ${game.title}`}
            >
              {game.cover_url ? (
                <img src={getBestGameCover(game)} alt={game.title} className={styles.cover} />
              ) : (
                <div className={styles.noCover}>{game.title.substring(0, 2).toUpperCase()}</div>
              )}
              <span className={styles.resultTitle}>{game.title}</span>
              {alreadyAdded && <span className={styles.addedBadge}>Adicionado</span>}
            </button>
          );
        })}
      </div>
    </Modal>
  );
}