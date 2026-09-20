import { queryOptions } from '@tanstack/react-query';
import { fetchAllPages } from '@/services/pagination';
import type { LibraryGame } from '@/types';

export const libraryKeys = {
  all: ['library'] as const,
  mine: () => [...libraryKeys.all, 'me'] as const,
};

export const myLibraryQuery = () => queryOptions({
  queryKey: libraryKeys.mine(),
  queryFn: () => fetchAllPages<LibraryGame>('/user-games/me'),
});
