import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import api from '@/services/api';
import { fetchAllPages } from '@/services/pagination';
import type { LibraryGame } from '@/types';

const LIBRARY_PAGE_SIZE = 100;
const MAX_LIBRARY_ITEMS = 10_000;

export const libraryKeys = {
  all: ['library'] as const,
  mine: () => [...libraryKeys.all, 'me'] as const,
  minePages: (userId: string) => [...libraryKeys.mine(), 'pages', userId] as const,
};

export const myLibraryQuery = () => queryOptions({
  queryKey: libraryKeys.mine(),
  queryFn: () => fetchAllPages<LibraryGame>('/user-games/me'),
});

export const myLibraryPagesQuery = (userId: string) => infiniteQueryOptions({
  queryKey: libraryKeys.minePages(userId),
  queryFn: async ({ pageParam }) => (
    await api.get<LibraryGame[]>('/user-games/me', {
      params: { offset: pageParam, limit: LIBRARY_PAGE_SIZE },
    })
  ).data,
  initialPageParam: 0,
  getNextPageParam: (lastPage, _pages, lastPageOffset) => {
    const nextOffset = lastPageOffset + lastPage.length;
    return lastPage.length === LIBRARY_PAGE_SIZE && nextOffset < MAX_LIBRARY_ITEMS
      ? nextOffset
      : undefined;
  },
  staleTime: 2 * 60 * 1000,
  gcTime: 30 * 60 * 1000,
});
