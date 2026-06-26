import { useState, useCallback, useEffect } from 'react';
import api from '@/services/api';
import { getAuthHeaders } from '@/services/auth';
import { LibraryGame } from '@/types/game';
import { UpdateLibraryGame } from '@/types/updateGame';


export function useLibrary(userId: string) {
  const [games, setGames] = useState<LibraryGame[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);

  const loadLibrary = useCallback(async () => {
    if (!userId) return;
    setLoadingLibrary(true);
    try {
      const response = await api.get(`/user-games/user/${userId}`, {
        headers: getAuthHeaders()
      });
      setGames(response.data);
    } catch {
      console.error('Erro ao carregar biblioteca');
    } finally {
      setLoadingLibrary(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) loadLibrary();
  }, [userId, loadLibrary]);

  const updateGame = async (
      id: string,
      data: Partial<UpdateLibraryGame>
  ) => {
    await api.put(`/user-games/${id}`, data, {
      headers: getAuthHeaders()
    });
    await loadLibrary();
  };

  const removeGame = async (id: string) => {
    await api.delete(`/user-games/${id}`, {
      headers: getAuthHeaders()
    });
    await loadLibrary();
  };

  return { games, loadingLibrary, loadLibrary, updateGame, removeGame };
}