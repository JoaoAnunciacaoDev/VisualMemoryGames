import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UpdateLibraryGame } from '@/types/updateGame';
import { libraryKeys, myLibraryQuery } from '@/features/library/queries';
import { removeLibraryGame, updateLibraryGame } from '@/features/library/mutations';


export function useLibrary() {
  const queryClient = useQueryClient();
  const libraryQuery = useQuery(myLibraryQuery());

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
    games: libraryQuery.data ?? [],
    loading: libraryQuery.isPending,
    error: libraryQuery.isError ? 'Erro ao carregar biblioteca.' : null,
    loadLibrary,
    updateGame,
    removeGame,
  };
}
