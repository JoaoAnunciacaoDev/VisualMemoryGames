import { queryOptions } from '@tanstack/react-query';
import api from '@/services/api';
import type { GameInList } from '@/types';

export interface CustomList {
  id: string;
  name: string;
  games: GameInList[];
  is_system: boolean;
  list_type: string | null;
}

const priority: Record<string, number> = {
  favorites: 1,
  completed_year: 2,
  platinized_year: 3,
};

export const customListKeys = {
  all: ['custom-lists'] as const,
  mine: () => [...customListKeys.all, 'me'] as const,
};

export const customListsQuery = () => queryOptions({
  queryKey: customListKeys.mine(),
  queryFn: async () => {
    const response = await api.get<CustomList[]>('/lists/me');
    return [...response.data].sort((a, b) => {
      const aPriority = a.list_type ? (priority[a.list_type] ?? 4) : 4;
      const bPriority = b.list_type ? (priority[b.list_type] ?? 4) : 4;
      return aPriority !== bPriority ? aPriority - bPriority : a.name.localeCompare(b.name);
    });
  },
});

export const createCustomList = (name: string) => api.post('/lists/', { name });
export const deleteCustomList = (id: string) => api.delete(`/lists/${id}`);
export const renameCustomList = ({ id, name }: { id: string; name: string }) =>
  api.put(`/lists/${id}`, { name });
export const addGamesToCustomList = ({ listId, gameIds }: { listId: string; gameIds: string[] }) =>
  Promise.all(gameIds.map((gameId) => api.post(`/lists/${listId}/games/${gameId}`, {})));
export const removeGameFromCustomList = ({ listId, gameId }: { listId: string; gameId: string }) =>
  api.delete(`/lists/${listId}/games/${gameId}`);
export const reorderCustomList = ({ listId, gameIds }: { listId: string; gameIds: string[] }) =>
  api.put(`/lists/${listId}/reorder`, { game_ids: gameIds });
