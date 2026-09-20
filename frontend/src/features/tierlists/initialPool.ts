import { getBestGameCover } from '@/services/media';
import type { CustomList, LibraryGame } from '@/types';
import type { TierListEditorInitialGame } from '@/services/tierlistEditor';
import type { TierListCreateValues } from './types';

const mapLibraryGame = (game: LibraryGame): TierListEditorInitialGame => ({
  id: game.game_id,
  title: game.title,
  coverUrl: getBestGameCover(game) ?? null,
});

export function selectTierListInitialPool(
  values: TierListCreateValues,
  libraryGames: LibraryGame[],
  customLists: CustomList[],
): TierListEditorInitialGame[] {
  if (values.gameSource === 'all') return libraryGames.map(mapLibraryGame);
  if (values.gameSource === 'status') {
    return libraryGames
      .filter((game) => game.status === values.selectedStatus)
      .map(mapLibraryGame);
  }
  if (values.gameSource === 'list') {
    const list = customLists.find((item) => item.id === values.selectedListId);
    return (
      list?.games.map((game) => ({
        id: game.id,
        title: game.title,
        coverUrl: getBestGameCover(game) ?? null,
      })) ?? []
    );
  }
  return [];
}
