import { useState, useCallback } from 'react';
import api from '@/services/api';
import { getAuthHeaders } from '@/services/auth';
import { LibraryGame } from '@/types/game';


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
    } finally {
      setLoadingLibrary(false);
    }
  }, [userId]);

  const updateGame = async (userGameId: string, data: {
    status: string;
    rating: number | null;
    started_at: string | null;
    finished_at: string | null;
    notes: string | null;
  }) => {
    await api.put(`/user-games/${userGameId}`, data, {
      headers: getAuthHeaders()
    });
    await loadLibrary();
  };

  const removeGame = async (userGameId: string) => {
    await api.delete(`/user-games/${userGameId}`, {
      headers: getAuthHeaders()
    });
    await loadLibrary();
  };

  return { games, loadingLibrary, loadLibrary, updateGame, removeGame };
}