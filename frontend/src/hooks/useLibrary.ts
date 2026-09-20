import { useCallback, useEffect, useMemo } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UpdateLibraryGame } from '@/types/updateGame';
import { libraryKeys, myLibraryPagesQuery } from '@/features/library/queries';
import { removeLibraryGame, updateLibraryGame } from '@/features/library/mutations';


export function useLibrary(userId = 'current-user', enabled = true) {
  const queryClient = useQueryClient();
  const libraryQuery = useInfiniteQuery({
    ...myLibraryPagesQuery(userId),
    enabled: Boolean(userId) && enabled,
  });
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isError,
    isFetching,
    isFetchingNextPage,
    isPending,
  } = libraryQuery;
  const games = useMemo(
    () => data?.pages.flat() ?? [],
    [data?.pages],
  );

  useEffect(() => {
    if (hasNextPage && !isFetching) {
      void fetchNextPage();
    }
  }, [
    data?.pages.length,
    fetchNextPage,
    hasNextPage,
    isFetching,
  ]);

  const loadLibrary = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: libraryKeys.mine() });
  }, [queryClient]);

  const updateMutation = useMutation({
    mutationFn: updateLibraryGame,
    onSuccess: loadLibrary,
  });
  const removeMutation = useMutation({
    mutationFn: removeLibraryGame,
    onSuccess: loadLibrary,
  });

  const updateGame = (id: string, data: Partial<UpdateLibraryGame>) =>
    updateMutation.mutateAsync({ id, data }).then(() => undefined);
  const removeGame = (id: string) => removeMutation.mutateAsync(id).then(() => undefined);

  return {
    games,
    loading: isPending,
    loadingMore: isFetchingNextPage,
    hasMore: Boolean(hasNextPage),
    error: isError ? 'Erro ao carregar biblioteca.' : null,
    loadLibrary,
    updateGame,
    removeGame,
  };
}
