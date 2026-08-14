import GameCard from '@/components/GameCard/GameCard';
import GameGrid from '@/components/GameGrid/GameGrid';
import SearchBar from '@/components/SearchBar/SearchBar';
import styles from '@/pages/Library/Library.module.css';
import type { GameResult } from '@/types';

interface Props {
  searchGames: (query: string) => void;
  isSearching: boolean;
  searchResults: GameResult[];
  addedGames: Map<number, string>;
  error?: string | null;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  onAddGame: (game: GameResult) => void;
  onRemoveGame: (externalId: number) => void;
  onOpenGame: (game: GameResult) => void;
  onManualAdd: () => void;
}

export default function LibrarySearchView({
  searchGames,
  isSearching,
  searchResults,
  addedGames,
  error,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  onAddGame,
  onRemoveGame,
  onOpenGame,
  onManualAdd,
}: Props) {
  return (
    <>
      <SearchBar onSearch={searchGames} isSearching={isSearching} onManualAdd={onManualAdd} />

      {error && (
        <div className={styles.emptyState} role="alert" style={{ borderColor: 'rgba(255, 107, 107, 0.4)', color: '#ff6b6b' }}>
          <p>{error}</p>
          <p style={{ fontSize: '0.875rem', marginTop: '0.5rem', opacity: 0.8 }}>
            Você também pode cadastrar o jogo manualmente se desejar.
          </p>
        </div>
      )}

      <GameGrid>
        {searchResults.map((game) => (
          <GameCard
            key={game.external_id}
            title={game.title}
            coverUrl={game.cover_url}
            releaseYear={game.release_year}
            isAdded={addedGames.has(game.external_id)}
            onAdd={() => onAddGame(game)}
            onRemove={() => onRemoveGame(game.external_id)}
            onClick={() => onOpenGame(game)}
          />
        ))}
      </GameGrid>

      {hasMore && onLoadMore && (
        <div className={styles.loadMoreContainer}>
          <button
            type="button"
            className={styles.loadMoreBtn}
            onClick={onLoadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? 'Carregando mais jogos...' : 'Carregar mais resultados'}
          </button>
        </div>
      )}

      {searchResults.length === 0 && !isSearching && !error && (
        <div className={styles.emptyState}>
          Pesquise por um título para adicionar à sua coleção.
        </div>
      )}
    </>
  );
}