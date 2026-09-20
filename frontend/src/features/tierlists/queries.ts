import { queryOptions } from '@tanstack/react-query';
import api from '@/services/api';
import { fetchAllPages } from '@/services/pagination';
import type { CustomList, LibraryGame, TierListSummary } from '@/types';
import {
  loadTierListEditorData,
  type TierListEditorInitialGame,
} from '@/services/tierlistEditor';

export const tierListKeys = {
  all: ['tierlists'] as const,
  mine: () => [...tierListKeys.all, 'me'] as const,
  editor: (id: string, initialGameIds: string[] = []) =>
    [...tierListKeys.all, 'editor', id, initialGameIds] as const,
};

export const tierListOverviewQuery = () => queryOptions({
  queryKey: tierListKeys.mine(),
  queryFn: async () => {
    const [tierLists, customLists, libraryGames] = await Promise.all([
      fetchAllPages<TierListSummary>('/tierlists/me'),
      fetchAllPages<CustomList>('/lists/me'),
      fetchAllPages<LibraryGame>('/user-games/me'),
    ]);
    return {
      tierLists,
      customLists,
      libraryGames,
    };
  },
});

export const tierListEditorQuery = (
  id: string,
  initialPool: TierListEditorInitialGame[] = [],
) => queryOptions({
  queryKey: tierListKeys.editor(id, initialPool.map((game) => game.id)),
  queryFn: () => loadTierListEditorData(id, initialPool),
});

export const createTierList = async ({ title, isPublic }: { title: string; isPublic: boolean }) =>
  (await api.post<{ id: string }>('/tierlists/', { title, is_public: isPublic })).data;

export const deleteTierList = async (id: string) => {
  await api.delete(`/tierlists/${id}`);
};
