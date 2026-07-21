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
  onAddGame,
  onRemoveGame,
  onOpenGame,
  onManualAdd,
}: Props) {
  return (
    <>
      <SearchBar onSearch={searchGames} isSearching={isSearching} onManualAdd={onManualAdd} />
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
      {searchResults.length === 0 && !isSearching && (
        <div className={styles.emptyState}>
          Pesquise por um título para adicionar à sua coleção.
        </div>
      )}
    </>
  );
}