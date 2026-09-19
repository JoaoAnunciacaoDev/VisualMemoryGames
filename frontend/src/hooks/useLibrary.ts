import { useCallback, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { UpdateLibraryGame } from '@/types/updateGame';
import { libraryKeys, myLibraryQuery } from '@/features/library/queries';


export function useLibrary() {
  const queryClient = useQueryClient();
  const libraryQuery = useQuery(myLibraryQuery());

  const loadLibrary = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: libraryKeys.mine() });
  }, [queryClient]);

  useEffect(() => {
    window.addEventListener('steam-synced', loadLibrary);
    window.addEventListener('gog-synced', loadLibrary);
    window.addEventListener('itch-synced', loadLibrary);
    window.addEventListener('epic-synced', loadLibrary);
    return () => {
      window.removeEventListener('steam-synced', loadLibrary);
      window.removeEventListener('gog-synced', loadLibrary);
      window.removeEventListener('itch-synced', loadLibrary);
      window.removeEventListener('epic-synced', loadLibrary);
    };
  }, [loadLibrary]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<UpdateLibraryGame> }) =>
      api.put(`/user-games/${id}`, data),
    onSuccess: loadLibrary,
  });
  const removeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/user-games/${id}`),
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
