import { queryOptions } from '@tanstack/react-query';
import api from '@/services/api';
import type { LibraryGame } from '@/types';

export const libraryKeys = {
  all: ['library'] as const,
  mine: () => [...libraryKeys.all, 'me'] as const,
};

export const myLibraryQuery = () => queryOptions({
  queryKey: libraryKeys.mine(),
  queryFn: async () => (await api.get<LibraryGame[]>('/user-games/me')).data,
});
