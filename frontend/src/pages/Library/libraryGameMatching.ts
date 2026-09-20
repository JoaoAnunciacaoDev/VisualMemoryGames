import type { GameResult, LibraryGame } from '@/types';

export function findMatchingLibraryGame(games: LibraryGame[], searchGame: GameResult | null) {
  if (!searchGame) return undefined;
  const title = searchGame.title.trim().toLowerCase();
  return games.find((game) => (
    game.title.trim().toLowerCase() === title
    || (searchGame.external_id !== null && game.external_id === searchGame.external_id
      && game.title.trim().toLowerCase() === title)
  ));
}
