import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import api from '@/services/api';
import type { GameResult } from '@/types';

export const gameKeys = {
  all: ['games'] as const,
  search: (search: string) => [...gameKeys.all, 'search', search] as const,
};

interface GameSearchResponse {
  results?: GameResult[];
}

export interface GameSearchPage {
  items: GameResult[];
  page: number;
}

async function fetchGameSearch(search: string, page: number): Promise<GameSearchPage> {
  const response = await api.get<GameResult[] | GameSearchResponse>('/games/search', {
    params: { q: search, page },
  });
  const data = response.data;
  return {
    items: Array.isArray(data) ? data : data.results ?? [],
    page,
  };
}

export const gameSearchQuery = (search: string) => queryOptions({
  queryKey: gameKeys.search(search),
  queryFn: async () => (await fetchGameSearch(search, 1)).items,
  enabled: search.length >= 3,
});

export const infiniteGameSearchQuery = (search: string) => infiniteQueryOptions({
  queryKey: [...gameKeys.search(search), 'infinite'] as const,
  queryFn: ({ pageParam }) => fetchGameSearch(search, pageParam),
  initialPageParam: 1,
  getNextPageParam: (lastPage) => lastPage.items.length >= 15 ? lastPage.page + 1 : undefined,
  enabled: search.length >= 3,
});
