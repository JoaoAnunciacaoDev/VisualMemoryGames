import { useState } from 'react';

import api from '@/services/api';
import { getAuthHeaders } from '@/services/auth';

import styles from '@/GameSearchModal.module.css';

interface GameResult {
  external_id: number;
  title: string;
  cover_url: string | null;
}

interface Props {
  onSelect: (game: { id: string; title: string; coverUrl: string | null }) => void;
  onClose: () => void;
  existingGameIds: Set<string>;
}

export default function GameSearchModal({ onSelect, onClose, existingGameIds }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GameResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (query.trim().length < 3) return;
    setIsSearching(true);
    try {
      const response = await api.get(`/games/search?q=${query}`);
      setResults(response.data);
    } catch {
      console.error('Erro ao buscar jogos');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelect = async (game: GameResult) => {
    try {
      const headers = getAuthHeaders();
      let gameId: string;

      try {
        const response = await api.post('/games/', {
          external_id: game.external_id,
          title: game.title,
          cover_url: game.cover_url,
          release_year: null,
          platforms: [],
          genres: [],
        }, { headers });
        gameId = response.data.id;
      } catch (err: any) {
        if (err.response?.status === 400) {
          const allGames = await api.get('/games/', { headers });
          const existing = allGames.data.find((g: any) => g.external_id === game.external_id);
          gameId = existing.id;
        } else throw err;
      }

      onSelect({ id: gameId, title: game.title, coverUrl: game.cover_url });
    } catch {
      console.error('Erro ao adicionar jogo');
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>Adicionar Jogo</h3>
          <button className={styles.closeButton} onClick={onClose}>✕</button>
        </div>

        <div className={styles.searchRow}>
          <input
            type="text"
            placeholder="Pesquisar jogo..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className={styles.input}
            autoFocus
          />
          <button
            className={styles.searchButton}
            onClick={handleSearch}
            disabled={isSearching || query.trim().length < 3}
          >
            {isSearching ? '...' : 'Buscar'}
          </button>
        </div>

        <div className={styles.results}>
          {results.map((game) => {
            const alreadyAdded = existingGameIds.has(String(game.external_id));
            return (
              <div
                key={game.external_id}
                className={`${styles.resultItem} ${alreadyAdded ? styles.alreadyAdded : ''}`}
                onClick={() => !alreadyAdded && handleSelect(game)}
              >
                {game.cover_url ? (
                  <img src={game.cover_url} alt={game.title} className={styles.cover} />
                ) : (
                  <div className={styles.noCover}>{game.title.substring(0, 2).toUpperCase()}</div>
                )}
                <span className={styles.resultTitle}>{game.title}</span>
                {alreadyAdded && <span className={styles.addedBadge}>Adicionado</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}