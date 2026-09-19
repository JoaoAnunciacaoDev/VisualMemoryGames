import { queryOptions } from '@tanstack/react-query';
import api from '@/services/api';
import type { GameResult } from '@/types';

export const gameKeys = {
  all: ['games'] as const,
  search: (search: string) => [...gameKeys.all, 'search', search] as const,
};

export const gameSearchQuery = (search: string) => queryOptions({
  queryKey: gameKeys.search(search),
  queryFn: async () => {
    const response = await api.get<GameResult[]>('/games/search', { params: { q: search } });
    return response.data;
  },
  enabled: search.length >= 3,
});
