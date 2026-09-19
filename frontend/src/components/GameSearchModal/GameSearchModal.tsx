import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getBestGameCover } from '@/services/media';
import Modal from '@/components/Shared/Modal/Modal';
import Input from '@/components/Shared/Input/Input';
import Button from '@/components/Shared/Button/Button';
import { useToast } from '@/hooks/useToast';
import { ensureGameRecord } from '@/features/games/mutations';
import styles from '@/components/GameSearchModal/GameSearchModal.module.css';
import { GameResult } from '@/types';
import { gameSearchQuery } from '@/features/games/queries';

interface Props {
  onSelect: (game: { id: string; title: string; coverUrl: string | null }) => void;
  onClose: () => void;
  existingGameIds: Set<string>;
}

export default function GameSearchModal({ onSelect, onClose, existingGameIds }: Props) {
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const { showToast } = useToast();
  const searchQuery = useQuery(gameSearchQuery(submittedQuery));
  const selectMutation = useMutation({
    mutationFn: (game: GameResult) => ensureGameRecord({ ...game, release_year: null }),
  });

  const handleSearch = () => {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 3) return;
    if (normalizedQuery === submittedQuery) {
      searchQuery.refetch();
    } else {
      setSubmittedQuery(normalizedQuery);
    }
  };

  const handleSelect = async (game: GameResult) => {
    try {
      const gameId = await selectMutation.mutateAsync(game);
      onSelect({ id: gameId, title: game.title, coverUrl: game.cover_url });
    } catch {
      showToast('Erro ao adicionar jogo.', 'error');
    }
  };

  const results = searchQuery.data ?? [];
  const backendError = searchQuery.error as { response?: { data?: { detail?: string } } } | null;
  const error = searchQuery.isError
    ? backendError?.response?.data?.detail || 'Erro ao buscar jogos no servidor.'
    : null;

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
          disabled={searchQuery.isFetching || query.trim().length < 3}
          className={styles.searchButton}
        >
          {searchQuery.isFetching ? '...' : 'Buscar'}
        </Button>
      </div>

      {error && (
        <div role="alert" style={{ padding: '0.75rem', margin: '0.5rem 0', borderRadius: '6px', background: 'rgba(255, 107, 107, 0.1)', color: '#ff6b6b', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

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
