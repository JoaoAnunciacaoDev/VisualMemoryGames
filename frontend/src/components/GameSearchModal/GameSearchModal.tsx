import { useState } from 'react';
import api from '@/services/api';
import { getBestGameCover } from '@/services/media';
import Modal from '@/components/Shared/Modal/Modal';
import Input from '@/components/Shared/Input/Input';
import Button from '@/components/Shared/Button/Button';
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
      let gameId: string;

      try {
        const response = await api.post('/games/', {
          external_id: game.external_id,
          title: game.title,
          cover_url: game.cover_url,
          release_year: null,
          platforms: [],
          genres: [],
        });
        gameId = response.data.id;
      } catch (err: any) {
        if (err.response?.status !== 400) throw err;
        const allGames = await api.get('/games/');
        const existing = allGames.data.find((g: any) => g.external_id === game.external_id);
        if (!existing) throw err;
        gameId = existing.id;
      }

      onSelect({ id: gameId, title: game.title, coverUrl: game.cover_url });
    } catch {
      console.error('Erro ao adicionar jogo');
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

      <div className={`${styles.results} scrollbar-gamelog`}>
        {results.map((game) => {
          const alreadyAdded = existingGameIds.has(String(game.external_id));
          return (
            <div
              key={game.external_id}
              className={`${styles.resultItem} ${alreadyAdded ? styles.alreadyAdded : ''}`}
              onClick={() => !alreadyAdded && handleSelect(game)}
            >
              {game.cover_url ? (
                <img src={getBestGameCover(game)} alt={game.title} className={styles.cover} />
              ) : (
                <div className={styles.noCover}>{game.title.substring(0, 2).toUpperCase()}</div>
              )}
              <span className={styles.resultTitle}>{game.title}</span>
              {alreadyAdded && <span className={styles.addedBadge}>Adicionado</span>}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}