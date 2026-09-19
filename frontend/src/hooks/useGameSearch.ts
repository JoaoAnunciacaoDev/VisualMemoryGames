import { useMemo, useState } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { addGameToLibrary as addGameToLibraryMutation } from '@/features/games/mutations';
import { infiniteGameSearchQuery } from '@/features/games/queries';
import { libraryKeys } from '@/features/library/queries';
import type { GameResult } from '@/types';

const getSearchError = (error: unknown) => {
  const detail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  return typeof detail === 'string'
    ? detail
    : 'Não foi possível comunicar com o serviço de busca de jogos. Tente novamente mais tarde.';
};

export function useGameSearch() {
  const queryClient = useQueryClient();
  const [currentQuery, setCurrentQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const searchQuery = useInfiniteQuery(infiniteGameSearchQuery(currentQuery));
  const addMutation = useMutation({
    mutationFn: addGameToLibraryMutation,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: libraryKeys.mine() }),
  });

  const searchResults = useMemo(() => {
    const uniqueResults = new Map<string, GameResult>();
    for (const game of searchQuery.data?.pages.flatMap((page) => page.items) ?? []) {
      uniqueResults.set(`${game.external_id ?? 'no-id'}:${game.title.trim().toLowerCase()}`, game);
    }
    return [...uniqueResults.values()];
  }, [searchQuery.data]);

  const searchGames = async (query: string) => {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 3) return;
    setHasSearched(true);
    if (normalizedQuery === currentQuery) {
      await searchQuery.refetch();
      return;
    }
    setCurrentQuery(normalizedQuery);
  };

  const clearResults = () => {
    setCurrentQuery('');
    setHasSearched(false);
  };

  return {
    searchResults,
    isSearching: currentQuery.length >= 3 && searchQuery.isPending,
    isLoadingMore: searchQuery.isFetchingNextPage,
    hasSearched,
    hasMore: searchQuery.hasNextPage,
    isAdding: addMutation.isPending,
    error: searchQuery.isError ? getSearchError(searchQuery.error) : null,
    searchGames,
    loadMore: async () => {
      if (searchQuery.hasNextPage && !searchQuery.isFetchingNextPage) {
        await searchQuery.fetchNextPage();
      }
    },
    clearResults,
    addGameToLibrary: (game: GameResult) => addMutation.mutateAsync(game),
  };
}
